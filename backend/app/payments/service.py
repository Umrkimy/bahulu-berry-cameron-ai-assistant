from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.payment import Payment
from app.payments.providers.stripe import StripeProvider


async def create_payment(
    db: AsyncSession,
    order: Order,
) -> Payment:

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
        return existing_payment


    payment = Payment(
        order_id=order.id,
        provider="stripe",
        amount=Decimal(str(order.total_amount)),
        currency="MYR",
        status="PENDING",
    )

    db.add(payment)

    await db.flush()


    provider = StripeProvider()

    stripe_result = await provider.create_payment(
        payment=payment,
        order=order,
    )

    payment.provider_payment_id = (
        stripe_result["provider_payment_id"]
    )

    payment.payment_url = (
        stripe_result["payment_url"]
    )

    await db.commit()

    await db.refresh(payment)

    return payment