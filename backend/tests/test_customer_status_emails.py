"""Customer status emails for website orders, with fictional data only."""

import itertools
import json
import re
import time
from decimal import Decimal

import pytest
import stripe
from sqlalchemy import select
from starlette.requests import Request
from starlette.responses import Response

import app.services.customer_status_emails as status_emails
from app.api.routes import payments as payment_routes
from app.api.routes.orders import dispatch_order
from app.api.routes.storefront import storefront_checkout
from app.core.config import Settings, settings
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.email_delivery import EmailDelivery
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_tracking_token import OrderTrackingToken
from app.models.payment import Payment
from app.models.product import Product
from app.schemas.order import OrderDispatch
from app.schemas.storefront import StorefrontCheckoutRequest
from app.services.customer_status_emails import (
    DELIVERY_FAILED,
    MAX_ATTEMPTS,
    ORDER_CANCELLED,
    ORDER_DELIVERED,
    ORDER_RECEIVED,
    ORDER_SHIPPED,
    send_queued_status_emails,
)
from app.services.delivery_services import update_delivery_status
from app.services.order_services import cancel_order
from app.services.order_tracking import find_order_by_token

client_ips = itertools.count(1)
STOREFRONT = "https://shop.example.com"


class FakeProvider:
    name = "stripe"

    async def create_payment(self, *, payment_id, **kwargs):
        return {"provider_payment_id": f"cs_test_fictional_{payment_id}", "payment_url": f"https://checkout.example.invalid/{payment_id}"}

    async def expire_payment(self, provider_payment_id):
        return None


class Outbox:
    """Stands in for the email provider and records what would be sent."""

    def __init__(self):
        self.sent: list[dict] = []
        self.result = "SENT"

    async def deliver(self, *, to_address, email_type, subject, html, idempotency_key):
        self.sent.append({"to": to_address, "type": email_type, "subject": subject, "html": html, "key": idempotency_key})
        return self.result, "fictional-message-id" if self.result == "SENT" else None


@pytest.fixture(autouse=True)
def outbox(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_CHECKOUT_ENABLED", True)
    monkeypatch.setattr(settings, "CUSTOMER_STATUS_EMAILS_ENABLED", True)
    monkeypatch.setattr(settings, "STOREFRONT_PUBLIC_URL", STOREFRONT)
    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: FakeProvider())
    box = Outbox()
    monkeypatch.setattr(status_emails, "deliver_email", box.deliver)
    return box


def request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": (f"10.2.0.{next(client_ips) % 250}", 1234)})


async def place_order(session, *, locale: str = "en", email: str | None = "buyer@example.com", key: str = "fictional-email-0001") -> Order:
    product = Product(name="Fictional bahulu", name_ms="Bahulu rekaan", price=Decimal("20.00"), is_active=True, storefront_published=True)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=10, low_stock_threshold=1))
    await session.commit()
    body = StorefrontCheckoutRequest.model_validate({
        "items": [{"product_id": product.id, "quantity": 2}],
        "contact": {
            "full_name": "Fictional Buyer", "phone_number": "012-345 6789", "email": email,
            "address": "1 Jalan Rekaan", "city": "Tanah Rata", "state": "Pahang", "postal_code": "39000",
        },
        "locale": locale,
        "privacy_notice_accepted": True,
    })
    result = await storefront_checkout(body, request(), session, Response(), key)
    return await session.get(Order, result.order_number)


def signed_webhook_request(event: dict) -> Request:
    payload = json.dumps(event)
    timestamp = int(time.time())
    signature = stripe.WebhookSignature._compute_signature(f"{timestamp}.{payload}", settings.STRIPE_WEBHOOK_SECRET.get_secret_value())
    body = payload.encode()

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    headers = [(b"stripe-signature", f"t={timestamp},v1={signature}".encode())]
    return Request({"type": "http", "method": "POST", "path": "/api/payments/webhook", "headers": headers}, receive)


async def pay(session, order: Order, event_id: str = "evt_fictional_paid") -> None:
    payment = await session.scalar(select(Payment).where(Payment.order_id == order.id))
    event = {
        "id": event_id, "object": "event", "type": "checkout.session.completed",
        "data": {"object": {
            "id": payment.provider_payment_id, "object": "checkout.session", "metadata": {"payment_id": str(payment.id)},
            "payment_status": "paid", "amount_total": int(payment.amount * 100), "currency": payment.currency.lower(),
        }},
    }
    await payment_routes.stripe_webhook(signed_webhook_request(event), session)


async def dispatch(session, order: Order) -> None:
    admin = Admin(username="fictional-staff", email="staff@example.com", password_hash="x", role="STAFF", is_active=True)
    session.add(admin)
    order.status = "PROCESSING"
    await session.commit()
    await dispatch_order(order.id, OrderDispatch(packing_confirmed=True, courier="Fictional Courier", tracking_number="FICT123"), session, admin)


async def queued_types(session) -> list[str]:
    return list((await session.scalars(select(EmailDelivery.email_type).where(EmailDelivery.order_id.is_not(None)).order_by(EmailDelivery.id))).all())


def tracking_token(html: str) -> str:
    return re.search(rf'href="{re.escape(STOREFRONT)}/orders/([A-Za-z0-9_-]+)"', html).group(1)


async def test_checkout_keeps_the_typed_email_and_language_on_the_order(session):
    # A returning customer keeps their saved email; the order keeps what was typed.
    session.add(Customer(full_name="Fictional Buyer", phone_number="+60123456789", canonical_phone_number="+60123456789", email="saved@example.com", canonical_email="saved@example.com"))
    await session.commit()

    order = await place_order(session, locale="ms", email="Typed@Example.com")

    assert order.contact_email == "typed@example.com"
    assert order.locale == "ms"
    customer = await session.get(Customer, order.customer_id)
    assert customer.email == "saved@example.com"


async def test_order_journey_sends_one_email_per_event_with_working_links(session, outbox):
    order = await place_order(session)
    await pay(session, order)
    await pay(session, order)  # Stripe retries the same event.
    await dispatch(session, order)
    await update_delivery_status(session, order.id, "DELIVERED")
    await session.commit()

    assert await queued_types(session) == [ORDER_RECEIVED, ORDER_SHIPPED, ORDER_DELIVERED]
    assert await send_queued_status_emails(session) == 3
    assert await send_queued_status_emails(session) == 0

    assert [email["subject"] for email in outbox.sent] == [
        f"Order #{order.id} received", f"Order #{order.id} is on the way", f"Order #{order.id} delivered",
    ]
    assert {email["to"] for email in outbox.sent} == {"buyer@example.com"}
    assert "RM 40.00" in outbox.sent[0]["html"] and "Thank you, Fictional." in outbox.sent[0]["html"]
    assert "Courier: Fictional Courier" in outbox.sent[1]["html"] and "Tracking number: FICT123" in outbox.sent[1]["html"]
    # Each email has its own link, and every link opens the order.
    tokens = [tracking_token(email["html"]) for email in outbox.sent]
    assert len(set(tokens)) == 3
    for token in tokens:
        assert (await find_order_by_token(session, token)).id == order.id
    records = (await session.scalars(select(EmailDelivery).where(EmailDelivery.order_id == order.id))).all()
    assert {record.status for record in records} == {"SENT"} and all(record.sent_at for record in records)


async def test_emails_use_the_checkout_language(session, outbox):
    order = await place_order(session, locale="ms")
    await pay(session, order)
    await session.commit()

    await send_queued_status_emails(session)

    [email] = outbox.sent
    assert email["subject"] == f"Pesanan #{order.id} diterima"
    assert "Terima kasih, Fictional." in email["html"] and "Jejak pesanan anda" in email["html"]


async def test_each_failed_delivery_is_its_own_email(session, outbox):
    order = await place_order(session)
    await pay(session, order)
    await dispatch(session, order)
    await update_delivery_status(session, order.id, "FAILED")
    await update_delivery_status(session, order.id, "OUT_FOR_DELIVERY")
    await update_delivery_status(session, order.id, "FAILED")
    await session.commit()

    assert await queued_types(session) == [ORDER_RECEIVED, ORDER_SHIPPED, DELIVERY_FAILED, DELIVERY_FAILED]


async def test_cancelling_a_paid_order_emails_but_an_unpaid_one_does_not(session):
    owner = Admin(username="fictional-owner", email="owner@example.com", password_hash="x", role="OWNER", is_active=True)
    session.add(owner)
    paid = await place_order(session)
    await pay(session, paid)
    assert (await cancel_order(session, paid.id, cancellation_admin_id=owner.id))["success"]
    unpaid = await place_order(session, key="fictional-email-0002")
    assert (await cancel_order(session, unpaid.id))["success"]
    await session.commit()

    rows = (await session.execute(select(EmailDelivery.order_id, EmailDelivery.email_type).where(EmailDelivery.order_id.is_not(None)))).all()
    assert sorted(rows) == [(paid.id, ORDER_CANCELLED), (paid.id, ORDER_RECEIVED)]


async def test_nothing_is_queued_or_sent_while_disabled(session, outbox, monkeypatch):
    monkeypatch.setattr(settings, "CUSTOMER_STATUS_EMAILS_ENABLED", False)
    order = await place_order(session)
    await pay(session, order)
    await session.commit()

    assert await queued_types(session) == []
    assert await send_queued_status_emails(session) == 0
    assert outbox.sent == []


async def test_orders_without_a_checkout_email_are_not_emailed(session):
    order = await place_order(session, email=None)
    await pay(session, order)
    await session.commit()

    assert order.contact_email is None
    assert await queued_types(session) == []


async def test_failed_sends_are_retried_then_given_up_without_a_working_link(session, outbox):
    order = await place_order(session)
    await pay(session, order)
    await session.commit()
    outbox.result = "FAILED"

    for _ in range(MAX_ATTEMPTS):
        await send_queued_status_emails(session)

    record = await session.scalar(select(EmailDelivery).where(EmailDelivery.order_id == order.id))
    assert record.status == "FAILED" and record.attempts == MAX_ATTEMPTS
    assert len(outbox.sent) == MAX_ATTEMPTS
    assert len({email["key"] for email in outbox.sent}) == 1  # The provider can drop duplicates.
    for email in outbox.sent:
        assert await find_order_by_token(session, tracking_token(email["html"])) is None
    # Only the checkout link exists.
    assert len((await session.scalars(select(OrderTrackingToken).where(OrderTrackingToken.order_id == order.id))).all()) == 1


async def test_dispatch_details_are_escaped_in_the_email(session, outbox):
    order = await place_order(session)
    await pay(session, order)
    admin = Admin(username="fictional-staff", email="staff@example.com", password_hash="x", role="STAFF", is_active=True)
    session.add(admin)
    order.status = "PROCESSING"
    await session.commit()
    await dispatch_order(order.id, OrderDispatch(packing_confirmed=True, courier="<b>Courier</b>"), session, admin)

    await send_queued_status_emails(session)

    assert "&lt;b&gt;Courier&lt;/b&gt;" in outbox.sent[-1]["html"]
    assert "<b>Courier</b>" not in outbox.sent[-1]["html"]


def test_production_needs_an_https_storefront_link_for_customer_emails():
    base = {
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:", "OPENAI_API_KEY": "fictional", "STRIPE_SECRET_KEY": "sk_test_fictional",
        "STRIPE_WEBHOOK_SECRET": "whsec_fictional", "STRIPE_SUCCESS_URL": "https://shop.example.com/checkout/success",
        "STRIPE_CANCEL_URL": "https://shop.example.com/checkout/cancelled", "SECRET_KEY": "x" * 40,
        "ENVIRONMENT": "production", "ALLOWED_ORIGINS": "https://shop.example.com", "TRUSTED_HOSTS": "api.example.com",
        "CUSTOMER_STATUS_EMAILS_ENABLED": True, "DEBUG": False,
    }
    with pytest.raises(RuntimeError, match="STOREFRONT_PUBLIC_URL"):
        Settings(**base, STOREFRONT_PUBLIC_URL="http://localhost:3000").validate_runtime_security()
    Settings(**base, STOREFRONT_PUBLIC_URL="https://shop.example.com").validate_runtime_security()
