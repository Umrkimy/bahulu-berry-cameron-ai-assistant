import itertools
import json
from decimal import Decimal

import pytest
import stripe
from fastapi import HTTPException
from sqlalchemy import select
from starlette.requests import Request

from app.api.routes import payments as payment_routes
from app.models.customer import Customer
from app.models.notification import Notification
from app.models.order import Order
from app.models.payment import Payment
from app.models.admin import Admin
from app.services.order_services import cancel_order


class FakeSession:
    def __init__(self, data: dict):
        self._data = data

    def to_dict(self) -> dict:
        return self._data


def webhook_request(signature: str | None = "t=1,v1=fake") -> Request:
    headers = [] if signature is None else [(b"stripe-signature", signature.encode())]
    body = json.dumps({"fictional": True}).encode()

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    return Request({"type": "http", "method": "POST", "path": "/api/payments/webhook", "headers": headers}, receive)


def use_event(monkeypatch, event_type: str, session_data: dict) -> None:
    # Each delivery gets a fresh event id, like separate Stripe events.
    event_ids = itertools.count(1)

    def construct_event(*args, **kwargs):
        return {"id": f"evt_fictional_{next(event_ids)}", "type": event_type, "data": {"object": FakeSession(session_data)}}

    monkeypatch.setattr(payment_routes.stripe.Webhook, "construct_event", construct_event)


def paid_session(payment: Payment, **overrides) -> dict:
    return {
        "id": payment.provider_payment_id,
        "metadata": {"payment_id": str(payment.id)},
        "payment_status": "paid",
        "amount_total": int(payment.amount * 100),
        "currency": "myr",
        **overrides,
    }


async def create_pending_payment(session, *, order_status: str = "PENDING"):
    session.add(Admin(username="Fictional Owner", email="owner@example.invalid", password_hash="x", role="OWNER"))
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    session.add(customer)
    await session.flush()
    order = Order(customer_id=customer.id, status=order_status, total_amount=Decimal("25.00"), payment_status="UNPAID")
    session.add(order)
    await session.flush()
    payment = Payment(
        order_id=order.id,
        provider="stripe",
        provider_payment_id="cs_test_fictional",
        amount=Decimal("25.00"),
        currency="MYR",
        status="PENDING",
    )
    session.add(payment)
    await session.commit()
    return order, payment


async def notification_titles(session) -> list[str]:
    return list((await session.scalars(select(Notification.title))).all())


@pytest.mark.asyncio
async def test_webhook_rejects_missing_signature(session):
    with pytest.raises(HTTPException) as error:
        await payment_routes.stripe_webhook(webhook_request(signature=None), session)
    assert error.value.status_code == 400


@pytest.mark.asyncio
async def test_paid_event_marks_payment_and_order_paid_once(session, monkeypatch):
    order, payment = await create_pending_payment(session)
    use_event(monkeypatch, "checkout.session.completed", paid_session(payment))

    first = await payment_routes.stripe_webhook(webhook_request(), session)
    second = await payment_routes.stripe_webhook(webhook_request(), session)

    await session.refresh(order)
    await session.refresh(payment)
    assert first["message"] == "Payment successfully processed."
    assert second["message"] == "Payment already processed."
    assert payment.status == "PAID"
    assert order.payment_status == "PAID"
    assert (await notification_titles(session)).count("Payment confirmed") == 1


@pytest.mark.asyncio
async def test_paid_event_with_wrong_amount_is_not_marked_paid(session, monkeypatch):
    order, payment = await create_pending_payment(session)
    use_event(monkeypatch, "checkout.session.completed", paid_session(payment, amount_total=100))

    result = await payment_routes.stripe_webhook(webhook_request(), session)

    await session.refresh(order)
    await session.refresh(payment)
    assert result["message"] == "Payment amount does not match."
    assert payment.status == "PENDING"
    assert order.payment_status == "UNPAID"
    assert "Payment needs review" in await notification_titles(session)


@pytest.mark.asyncio
async def test_cancelling_an_order_expires_its_open_payment_link(session, monkeypatch):
    expired_sessions: list[str] = []

    class RecordingStripeProvider:
        async def expire_payment(self, provider_payment_id: str) -> None:
            expired_sessions.append(provider_payment_id)

    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: RecordingStripeProvider())
    order, payment = await create_pending_payment(session)

    result = await cancel_order(session, order.id)
    await session.commit()

    await session.refresh(payment)
    assert result["success"] is True
    assert expired_sessions == ["cs_test_fictional"]
    assert payment.status == "EXPIRED"

    # Stripe's own expiry event for that link must not alert owners a second time.
    use_event(monkeypatch, "checkout.session.expired", paid_session(payment, payment_status="unpaid"))
    response = await payment_routes.stripe_webhook(webhook_request(), session)
    assert response["message"] == "Payment already expired."
    assert "Payment link expired" not in await notification_titles(session)


@pytest.mark.asyncio
async def test_cancellation_still_succeeds_when_stripe_cannot_expire_the_link(session, monkeypatch):
    class FailingStripeProvider:
        async def expire_payment(self, provider_payment_id: str) -> None:
            raise stripe.InvalidRequestError("Session is already complete.", None)

    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: FailingStripeProvider())
    order, payment = await create_pending_payment(session)

    result = await cancel_order(session, order.id)

    assert result["success"] is True
    assert payment.status == "EXPIRED"


@pytest.mark.asyncio
async def test_payment_after_cancellation_is_recorded_and_flagged_for_refund(session, monkeypatch):
    order, payment = await create_pending_payment(session, order_status="CANCELLED")
    payment.status = "EXPIRED"
    await session.commit()
    use_event(monkeypatch, "checkout.session.completed", paid_session(payment))

    result = await payment_routes.stripe_webhook(webhook_request(), session)

    await session.refresh(order)
    await session.refresh(payment)
    assert result["message"] == "Payment received for a cancelled order."
    assert payment.status == "PAID"
    assert order.payment_status == "PAID"
    assert order.status == "CANCELLED"
    titles = await notification_titles(session)
    assert "Payment received for a cancelled order" in titles
    assert "Payment confirmed" not in titles
