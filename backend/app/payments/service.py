import logging
from datetime import UTC, datetime
from decimal import Decimal

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order
from app.models.payment import Payment
from app.core.config import settings
from app.payments.registry import get_payment_provider


logger = logging.getLogger("bahulu.payments")


async def create_payment(
    db: AsyncSession,
    order: Order,
    *,
    customer_name: str | None = None,
    customer_email: str | None = None,
    customer_phone: str | None = None,
) -> tuple[Payment, bool]:
    """Create (or reuse) the pending payment link for an order.

    Website checkout passes the contact details the customer typed so an
    existing customer record is never used to label someone else's payment.
    """

    result = await db.execute(
        select(Payment)
        .where(
            Payment.order_id == order.id,
            Payment.status == "PENDING",
        )
        .order_by(
            Payment.created_at.desc()
        )
    )

    existing_payment = result.scalars().first()

    if existing_payment is not None:
        return existing_payment, False


    payment = Payment(
        order_id=order.id,
        provider=settings.PAYMENT_PROVIDER,
        amount=Decimal(str(order.total_amount)),
        currency="MYR",
        status="PENDING",
    )

    db.add(payment)

    await db.flush()


    order_result = await db.execute(
        select(Order)
        .options(selectinload(Order.customer))
        .where(Order.id == order.id)
    )
    order_with_customer = order_result.scalar_one()

    provider = get_payment_provider(payment.provider)
    customer = order_with_customer.customer

    stripe_result = await provider.create_payment(
        payment_id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        description=f"Bahulu Berry Cameron Order #{order.id}",
        customer_name=customer_name or customer.full_name,
        customer_email=customer_email if customer_name is not None else customer.email,
        customer_phone=customer_phone or customer.phone_number,
    )

    payment.provider_payment_id = (
        stripe_result["provider_payment_id"]
    )

    payment.payment_url = (
        stripe_result["payment_url"]
    )

    return payment, True


async def expire_pending_payments(
    db: AsyncSession,
    order_id: int,
) -> None:
    """Close open payment links so a cancelled order cannot be paid.

    Stripe may already be completing a session; that is handled by the webhook,
    so a failed provider call is logged rather than blocking the cancellation.
    """
    result = await db.execute(
        select(Payment)
        .where(
            Payment.order_id == order_id,
            Payment.status == "PENDING",
        )
        .with_for_update()
    )

    for payment in result.scalars().all():
        if payment.provider_payment_id:
            try:
                await get_payment_provider(payment.provider).expire_payment(payment.provider_payment_id)
            except (stripe.StripeError, ValueError):
                logger.warning("payment_link_expire_failed", extra={"payment_id": payment.id})

        payment.status = "EXPIRED"

    await db.flush()


async def refund_payment(
    db: AsyncSession,
    payment: Payment,
    reason: str,
) -> Payment:
    if payment.status == "REFUNDED":
        raise ValueError("This payment has already been refunded.")

    if payment.status != "PAID":
        raise ValueError("Only paid payments can be refunded.")

    if not payment.provider_payment_id:
        raise ValueError("This payment cannot be refunded through its provider.")

    provider = get_payment_provider(payment.provider)
    stripe_result = await provider.refund_payment(
        payment.provider_payment_id,
        payment.id,
    )

    if stripe_result["status"] != "succeeded":
        raise ValueError("Stripe has not confirmed this refund yet.")

    order = await db.get(Order, payment.order_id)
    if order is None:
        raise ValueError("The order for this payment could not be found.")

    payment.status = "REFUNDED"
    payment.provider_refund_id = stripe_result["provider_refund_id"]
    payment.refund_reason = reason.strip()
    payment.refunded_at = datetime.now(UTC)
    order.payment_status = "REFUNDED"

    await db.flush()
    return payment
