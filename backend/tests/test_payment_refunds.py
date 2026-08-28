from decimal import Decimal

import pytest

from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment
from app.payments.service import refund_payment


class SuccessfulStripeProvider:
    async def refund_payment(self, provider_payment_id: str, payment_id: int) -> dict:
        return {"provider_refund_id": "re_test_123", "status": "succeeded"}


class PendingStripeProvider:
    async def refund_payment(self, provider_payment_id: str, payment_id: int) -> dict:
        return {"provider_refund_id": "re_test_123", "status": "pending"}


async def create_paid_payment(session):
    customer = Customer(full_name="Umar", phone_number="0123456789")
    session.add(customer)
    await session.flush()
    order = Order(customer_id=customer.id, total_amount=Decimal("25.00"), payment_status="PAID")
    session.add(order)
    await session.flush()
    payment = Payment(
        order_id=order.id,
        provider="stripe",
        provider_payment_id="cs_test_123",
        amount=Decimal("25.00"),
        currency="MYR",
        status="PAID",
    )
    session.add(payment)
    await session.commit()
    return order, payment


async def test_refund_updates_payment_and_order_after_stripe_confirmation(session, monkeypatch):
    monkeypatch.setattr("app.payments.service.StripeProvider", SuccessfulStripeProvider)
    order, payment = await create_paid_payment(session)

    refunded = await refund_payment(session, payment, "Customer changed their mind")

    assert refunded.status == "REFUNDED"
    assert refunded.provider_refund_id == "re_test_123"
    assert refunded.refund_reason == "Customer changed their mind"
    assert refunded.refunded_at is not None
    assert order.payment_status == "REFUNDED"


async def test_refund_rejects_duplicate_or_unpaid_payments(session, monkeypatch):
    monkeypatch.setattr("app.payments.service.StripeProvider", SuccessfulStripeProvider)
    _, payment = await create_paid_payment(session)
    payment.status = "REFUNDED"

    with pytest.raises(ValueError, match="already been refunded"):
        await refund_payment(session, payment, "Duplicate request")

    payment.status = "PENDING"
    with pytest.raises(ValueError, match="Only paid payments"):
        await refund_payment(session, payment, "Not paid")


async def test_refund_does_not_change_local_state_before_stripe_confirms(session, monkeypatch):
    monkeypatch.setattr("app.payments.service.StripeProvider", PendingStripeProvider)
    order, payment = await create_paid_payment(session)

    with pytest.raises(ValueError, match="not confirmed"):
        await refund_payment(session, payment, "Awaiting Stripe")

    assert payment.status == "PAID"
    assert payment.refunded_at is None
    assert order.payment_status == "PAID"
