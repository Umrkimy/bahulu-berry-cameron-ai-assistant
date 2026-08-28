from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order
from app.models.payment import Payment
from app.payments.providers.stripe import StripeProvider


async def create_payment(
    db: AsyncSession,
    order: Order,
) -> tuple[Payment, bool]:

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
        provider="stripe",
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

    provider = StripeProvider()

    stripe_result = await provider.create_payment(
        payment_id=payment.id,
        amount=payment.amount,
        currency=payment.currency,
        description=f"Bahulu Berry Cameron Order #{order.id}",
        customer_name=order_with_customer.customer.full_name,
        customer_email=order_with_customer.customer.email,
        customer_phone=order_with_customer.customer.phone_number,
    )

    payment.provider_payment_id = (
        stripe_result["provider_payment_id"]
    )

    payment.payment_url = (
        stripe_result["payment_url"]
    )

    return payment, True


async def refund_payment(
    db: AsyncSession,
    payment: Payment,
    reason: str,
) -> Payment:
    if payment.status == "REFUNDED":
        raise ValueError("This payment has already been refunded.")

    if payment.status != "PAID":
        raise ValueError("Only paid payments can be refunded.")

    if payment.provider != "stripe" or not payment.provider_payment_id:
        raise ValueError("This payment cannot be refunded through Stripe.")

    provider = StripeProvider()
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
