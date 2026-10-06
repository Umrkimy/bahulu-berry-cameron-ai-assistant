"""Status emails to website customers.

A status change queues one ``EmailDelivery`` row (status QUEUED) in the same
transaction as the change, so an email exists only if the change was saved.
``send_queued_status_emails`` runs in the background, renders the email in
the order's checkout language, and adds a fresh tracking link to each one.
Failed sends are retried up to ``MAX_ATTEMPTS`` times.

Only website orders with a checkout email are emailed, and nothing is queued
or sent unless ``CUSTOMER_STATUS_EMAILS_ENABLED`` is on. The wording is a
draft awaiting Umar's review; it states facts only and promises no times.
"""

import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.email_delivery import EmailDelivery
from app.models.order import Order
from app.models.order_tracking_token import OrderTrackingToken
from app.services.email_services import deliver_email, email_html
from app.services.order_tracking import (
    hash_tracking_token,
    is_trackable,
    new_tracking_token,
)

logger = logging.getLogger("bahulu.email")

ORDER_RECEIVED = "CUSTOMER_ORDER_RECEIVED"
ORDER_SHIPPED = "CUSTOMER_ORDER_SHIPPED"
ORDER_DELIVERED = "CUSTOMER_ORDER_DELIVERED"
DELIVERY_FAILED = "CUSTOMER_DELIVERY_FAILED"
ORDER_CANCELLED = "CUSTOMER_ORDER_CANCELLED"

MAX_ATTEMPTS = 5
BATCH_SIZE = 20

# Stage names match the storefront tracking page (storefront/app/_lib/tracking-copy.ts).
COPY = {
    "en": {
        ORDER_RECEIVED: ("Order #{number} received", "Thank you, {name}. We have received your payment for order #{number} ({total})."),
        ORDER_SHIPPED: ("Order #{number} is on the way", "Your order #{number} is on the way."),
        ORDER_DELIVERED: ("Order #{number} delivered", "Your order #{number} has been delivered."),
        DELIVERY_FAILED: ("Order #{number}: delivery unsuccessful", "Delivery of your order #{number} was unsuccessful. We will contact you."),
        ORDER_CANCELLED: ("Order #{number} cancelled", "Your order #{number} has been cancelled."),
        "courier": "Courier: {value}",
        "tracking_number": "Tracking number: {value}",
        "help": "Questions about your order? Message us on WhatsApp with your order number.",
        "button": "Track your order",
        "footer": "Bahulu Berry Cameron · You are receiving this email because you placed an order on our website.",
        "fallback_name": "there",
    },
    "ms": {
        ORDER_RECEIVED: ("Pesanan #{number} diterima", "Terima kasih, {name}. Kami telah menerima bayaran anda untuk pesanan #{number} ({total})."),
        ORDER_SHIPPED: ("Pesanan #{number} dalam perjalanan", "Pesanan #{number} anda sedang dalam perjalanan."),
        ORDER_DELIVERED: ("Pesanan #{number} telah dihantar", "Pesanan #{number} anda telah dihantar."),
        DELIVERY_FAILED: ("Pesanan #{number}: penghantaran tidak berjaya", "Penghantaran pesanan #{number} anda tidak berjaya. Kami akan menghubungi anda."),
        ORDER_CANCELLED: ("Pesanan #{number} dibatalkan", "Pesanan #{number} anda telah dibatalkan."),
        "courier": "Kurier: {value}",
        "tracking_number": "Nombor penjejakan: {value}",
        "help": "Ada soalan tentang pesanan anda? Hantar mesej kepada kami di WhatsApp bersama nombor pesanan anda.",
        "button": "Jejak pesanan anda",
        "footer": "Bahulu Berry Cameron · Anda menerima e-mel ini kerana anda membuat pesanan di laman web kami.",
        "fallback_name": "pelanggan",
    },
}


async def queue_status_email(db: AsyncSession, order: Order, email_type: str, occurrence: str | None = None) -> None:
    """Queue one status email for a website order, once per event.

    ``occurrence`` separates events that can happen more than once, such as a
    second failed delivery. Callers hold the order row lock, so two requests
    cannot queue the same key.
    """
    if not settings.CUSTOMER_STATUS_EMAILS_ENABLED or order.source != "STOREFRONT" or not order.contact_email:
        return
    key = f"order-status:{order.id}:{email_type}" + (f":{occurrence}" if occurrence else "")
    if await db.scalar(select(EmailDelivery.id).where(EmailDelivery.idempotency_key == key)):
        return
    db.add(EmailDelivery(order_id=order.id, email_type=email_type, idempotency_key=key, status="QUEUED"))


def render_status_email(order: Order, email_type: str, tracking_url: str) -> tuple[str, str]:
    """Return the subject and HTML for one status email."""
    copy = COPY["ms" if order.locale == "ms" else "en"]
    delivery = order.delivery
    first_name = ((delivery.recipient_name if delivery else None) or "").split()
    subject_template, body_template = copy[email_type]
    values = {"number": order.id, "name": first_name[0] if first_name else copy["fallback_name"], "total": f"RM {order.total_amount:,.2f}"}
    lines = [body_template.format(**values)]
    if email_type == ORDER_SHIPPED and delivery:
        if delivery.courier:
            lines.append(copy["courier"].format(value=delivery.courier))
        if delivery.tracking_number:
            lines.append(copy["tracking_number"].format(value=delivery.tracking_number))
    lines.append(copy["help"])
    subject = subject_template.format(**values)
    return subject, email_html(subject, "\n".join(lines), tracking_url, copy["button"], footer=copy["footer"])


async def _send_one(db: AsyncSession, record: EmailDelivery) -> None:
    order = await db.scalar(select(Order).options(selectinload(Order.delivery)).where(Order.id == record.order_id))
    if order is None or not order.contact_email or not is_trackable(order):
        record.status = "SKIPPED"
        return
    token = new_tracking_token()
    tracking_url = f"{settings.STOREFRONT_PUBLIC_URL.rstrip('/')}/orders/{token}"
    subject, html = render_status_email(order, record.email_type, tracking_url)
    status, provider_message_id = await deliver_email(
        to_address=order.contact_email, email_type=record.email_type, subject=subject, html=html,
        idempotency_key=record.idempotency_key,
    )
    record.attempts += 1
    if status == "SENT":
        # The link only becomes valid once its email has gone out.
        db.add(OrderTrackingToken(order_id=order.id, token_hash=hash_tracking_token(token)))
        record.status = "SENT"
        record.sent_at = datetime.now(UTC)
        record.provider_message_id = provider_message_id
    elif status == "SKIPPED" or record.attempts >= MAX_ATTEMPTS:
        record.status = status if status == "SKIPPED" else "FAILED"
        logger.warning("customer_status_email_not_sent type=%s order_id=%s status=%s", record.email_type, order.id, record.status)


async def send_queued_status_emails(db: AsyncSession) -> int:
    """Send waiting status emails; returns how many were sent."""
    if not settings.CUSTOMER_STATUS_EMAILS_ENABLED:
        return 0
    queued_ids = (await db.scalars(
        select(EmailDelivery.id).where(EmailDelivery.status == "QUEUED").order_by(EmailDelivery.id).limit(BATCH_SIZE)
    )).all()
    sent = 0
    for record_id in queued_ids:
        # skip_locked lets several API workers share the queue without
        # sending the same email twice.
        record = await db.scalar(
            select(EmailDelivery).where(EmailDelivery.id == record_id, EmailDelivery.status == "QUEUED").with_for_update(skip_locked=True)
        )
        if record is None:
            await db.rollback()
            continue
        await _send_one(db, record)
        sent += record.status == "SENT"
        await db.commit()
    return sent
