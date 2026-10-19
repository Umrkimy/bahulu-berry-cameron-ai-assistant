"""Replacing an order's payment link, with fictional data and a fake provider."""

from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select
from starlette.requests import Request

from app.api.routes import payments as payment_routes
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.order import Order
from app.models.payment import Payment


class FakeProvider:
    name = "stripe"

    def __init__(self):
        self.states: dict[str, str] = {}
        self.expired: list[str] = []
        self.created = 0

    async def create_payment(self, *, payment_id, **_):
        self.created += 1
        session_id = f"cs_test_fictional_{payment_id}"
        self.states[session_id] = "open"
        return {"provider_payment_id": session_id, "payment_url": f"https://checkout.example.invalid/{payment_id}"}

    async def get_payment_state(self, provider_payment_id):
        return self.states.get(provider_payment_id, "expired")

    async def expire_payment(self, provider_payment_id):
        self.expired.append(provider_payment_id)
        self.states[provider_payment_id] = "expired"


@pytest.fixture
def provider(monkeypatch):
    fake = FakeProvider()
    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: fake)
    return fake


def request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": ("10.9.0.1", 1234)})


async def order_with_link(session) -> tuple[Order, Admin]:
    admin = Admin(username="fictional-owner", email="owner@example.com", password_hash="x", role="OWNER")
    customer = Customer(full_name="Fictional Customer", phone_number="012-000 0000")
    session.add_all([admin, customer])
    await session.flush()
    order = Order(customer_id=customer.id, total_amount=Decimal("40.00"), status="PENDING", payment_status="UNPAID")
    session.add(order)
    await session.commit()
    await payment_routes.create_order_payment(order.id, request(), session, admin)
    return order, admin


async def payments_for(session, order_id):
    return (await session.scalars(select(Payment).where(Payment.order_id == order_id).order_by(Payment.id))).all()


@pytest.mark.asyncio
async def test_renewing_closes_the_open_link_and_issues_a_new_one(session, provider):
    order, admin = await order_with_link(session)

    renewed = await payment_routes.renew_order_payment(order.id, request(), session, admin)

    old, new = await payments_for(session, order.id)
    assert old.status == "EXPIRED"
    assert provider.expired == [old.provider_payment_id]
    assert new.id == renewed.id and new.status == "PENDING"
    assert new.payment_url != old.payment_url


@pytest.mark.asyncio
async def test_renewing_an_already_expired_link_does_not_call_expire(session, provider):
    order, admin = await order_with_link(session)
    old = (await payments_for(session, order.id))[0]
    provider.states[old.provider_payment_id] = "expired"

    await payment_routes.renew_order_payment(order.id, request(), session, admin)

    assert provider.expired == []
    assert [payment.status for payment in await payments_for(session, order.id)] == ["EXPIRED", "PENDING"]


@pytest.mark.asyncio
async def test_a_link_the_customer_already_paid_is_never_replaced(session, provider):
    order, admin = await order_with_link(session)
    old = (await payments_for(session, order.id))[0]
    provider.states[old.provider_payment_id] = "complete"
    order_id = order.id

    with pytest.raises(HTTPException) as error:
        await payment_routes.renew_order_payment(order_id, request(), session, admin)

    assert error.value.status_code == 409
    assert provider.created == 1
    assert [payment.status for payment in await payments_for(session, order_id)] == ["PENDING"]


@pytest.mark.asyncio
async def test_paid_orders_cannot_get_a_new_link(session, provider):
    order, admin = await order_with_link(session)
    order.payment_status = "PAID"
    await session.commit()

    with pytest.raises(HTTPException) as error:
        await payment_routes.renew_order_payment(order.id, request(), session, admin)

    assert error.value.status_code == 400
