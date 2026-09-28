"""Website checkout with fictional customers and a fake payment provider.

Webhook tests sign payloads with the configured webhook secret, so Stripe's
real signature verification runs instead of being monkeypatched.
"""

import itertools
import json
import time
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import ClassVar

import pytest
import stripe
from fastapi import HTTPException
from sqlalchemy import func, select
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes import payments as payment_routes
from app.api.routes.storefront import storefront_checkout, storefront_checkout_status
from app.core.config import Settings, settings
from app.models.checkout import CheckoutRequest
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.payment import Payment
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.storefront import StorefrontCheckoutRequest
from app.services.storefront_checkout import cancel_stale_storefront_orders

client_ips = itertools.count(1)


def request(path: str = "/api/storefront/checkout") -> Request:
    # A fresh fictional address per call keeps the in-memory rate limiter out of the way.
    return Request({"type": "http", "method": "POST", "path": path, "headers": [], "client": (f"10.0.0.{next(client_ips) % 250}", 1234)})


class FakeProvider:
    name = "stripe"
    created: ClassVar[list[int]] = []

    async def create_payment(self, *, payment_id, **kwargs):
        FakeProvider.created.append(payment_id)
        return {"provider_payment_id": f"cs_test_fictional_{payment_id}", "payment_url": f"https://checkout.example.invalid/{payment_id}"}

    async def expire_payment(self, provider_payment_id):
        return None

    async def refund_payment(self, provider_payment_id, payment_id):
        raise AssertionError("not used")


class FailingProvider(FakeProvider):
    async def create_payment(self, **kwargs):
        raise stripe.APIConnectionError("fictional outage")


@pytest.fixture(autouse=True)
def checkout_enabled(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_CHECKOUT_ENABLED", True)
    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: FakeProvider())
    FakeProvider.created = []


async def published_product(session, *, quantity: int = 5, price: str = "20.00", published: bool = True) -> tuple[Product, Inventory]:
    product = Product(
        name="Fictional bahulu", price=Decimal(price), is_active=True,
        storefront_published=published, name_ms="Bahulu rekaan",
    )
    session.add(product)
    await session.flush()
    inventory = Inventory(product_id=product.id, quantity=quantity, low_stock_threshold=1)
    session.add(inventory)
    await session.commit()
    return product, inventory


def checkout_body(product_id: int, quantity: int = 2, **contact) -> StorefrontCheckoutRequest:
    return StorefrontCheckoutRequest.model_validate({
        "items": [{"product_id": product_id, "quantity": quantity}],
        "contact": {
            "full_name": "Fictional Buyer",
            "phone_number": "012-345 6789",
            "email": "buyer@example.com",
            "address": "1 Jalan Rekaan",
            "city": "Tanah Rata",
            "state": "Pahang",
            "postal_code": "39000",
            **contact,
        },
        "locale": "en",
        "privacy_notice_accepted": True,
    })


async def checkout(session, body, key: str = "fictional-key-0001"):
    return await storefront_checkout(body, request(), session, Response(), key)


async def test_checkout_is_hidden_when_disabled(session, monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_CHECKOUT_ENABLED", False)
    product, _ = await published_product(session)
    with pytest.raises(HTTPException) as error:
        await checkout(session, checkout_body(product.id))
    assert error.value.status_code == 404
    status = await storefront_checkout_status(request(), Response())
    assert status.enabled is False


async def test_checkout_creates_priced_order_payment_and_deducts_stock(session):
    product, inventory = await published_product(session)

    result = await checkout(session, checkout_body(product.id, quantity=2))

    assert result.total_amount == Decimal("40.00")
    assert result.payment_url.startswith("https://checkout.example.invalid/")
    order = await session.get(Order, result.order_number)
    assert order.source == "STOREFRONT"
    assert order.status == "PENDING" and order.payment_status == "UNPAID"
    delivery = await session.scalar(select(Delivery).where(Delivery.order_id == order.id))
    assert delivery.recipient_phone == "+60123456789"
    assert delivery.postal_code == "39000"
    await session.refresh(inventory)
    assert inventory.quantity == 3
    movement = await session.scalar(select(StockMovement).where(StockMovement.movement_type == "ORDER_DEDUCTION"))
    assert movement.source_id == order.id
    payment = await session.scalar(select(Payment).where(Payment.order_id == order.id))
    assert payment.status == "PENDING" and payment.provider == "stripe"


async def test_checkout_replay_returns_same_order_and_rejects_changed_body(session):
    product, inventory = await published_product(session)

    first = await checkout(session, checkout_body(product.id))
    again = await checkout(session, checkout_body(product.id))

    assert again.order_number == first.order_number
    assert again.payment_url == first.payment_url
    assert await session.scalar(select(func.count(Order.id))) == 1
    assert FakeProvider.created == [1]
    await session.refresh(inventory)
    assert inventory.quantity == 3

    with pytest.raises(HTTPException) as error:
        await checkout(session, checkout_body(product.id, quantity=1))
    assert error.value.status_code == 409
    assert error.value.detail["code"] == "IDEMPOTENCY_MISMATCH"


async def test_checkout_never_overwrites_an_existing_customer(session):
    session.add(Customer(
        full_name="Existing Fictional Regular", phone_number="+60123456789",
        canonical_phone_number="+60123456789", address="9 Jalan Asal", city="Brinchang",
    ))
    await session.commit()
    product, _ = await published_product(session)

    result = await checkout(session, checkout_body(product.id, full_name="Someone Else", address="2 Jalan Lain"))

    customer = await session.scalar(select(Customer))
    assert customer.full_name == "Existing Fictional Regular"
    assert customer.address == "9 Jalan Asal"
    assert await session.scalar(select(func.count(Customer.id))) == 1
    delivery = await session.scalar(select(Delivery).where(Delivery.order_id == result.order_number))
    assert delivery.recipient_name == "Someone Else"
    assert delivery.address == "2 Jalan Lain"


@pytest.mark.parametrize("quantity,published", [(10, True), (1, False)])
async def test_checkout_refuses_unavailable_items_without_side_effects(session, quantity, published):
    product, inventory = await published_product(session, quantity=5, published=published)

    with pytest.raises(HTTPException) as error:
        await checkout(session, checkout_body(product.id, quantity=quantity))

    assert error.value.status_code == 409
    assert error.value.detail["code"] == "UNAVAILABLE"
    assert await session.scalar(select(func.count(Order.id))) == 0
    await session.refresh(inventory)
    assert inventory.quantity == 5


async def test_checkout_rolls_back_when_payment_provider_is_down(session, monkeypatch):
    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: FailingProvider())
    product, inventory = await published_product(session)

    with pytest.raises(HTTPException) as error:
        await checkout(session, checkout_body(product.id))

    assert error.value.status_code == 503
    assert await session.scalar(select(func.count(Order.id))) == 0
    assert await session.scalar(select(func.count(CheckoutRequest.id))) == 0
    await session.refresh(inventory)
    assert inventory.quantity == 5


def test_live_stripe_key_is_refused_for_website_checkout():
    base = {
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:", "OPENAI_API_KEY": "fictional",
        "STRIPE_WEBHOOK_SECRET": "whsec_fictional", "STRIPE_SUCCESS_URL": "http://localhost:3000/checkout/success",
        "STRIPE_CANCEL_URL": "http://localhost:3000/checkout/cancelled", "SECRET_KEY": "x" * 40,
        "STOREFRONT_CHECKOUT_ENABLED": True,
    }
    with pytest.raises(RuntimeError, match="test key"):
        Settings(**base, STRIPE_SECRET_KEY="sk_live_fictional").validate_payment_safety()
    Settings(**base, STRIPE_SECRET_KEY="sk_test_fictional").validate_payment_safety()
    Settings(**base, STRIPE_SECRET_KEY="sk_live_fictional", PAYMENTS_LIVE_APPROVED=True).validate_payment_safety()


def signed_webhook_request(event: dict) -> Request:
    payload = json.dumps(event)
    timestamp = int(time.time())
    signature = stripe.WebhookSignature._compute_signature(
        f"{timestamp}.{payload}", settings.STRIPE_WEBHOOK_SECRET.get_secret_value(),
    )
    body = payload.encode()

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    headers = [(b"stripe-signature", f"t={timestamp},v1={signature}".encode())]
    return Request({"type": "http", "method": "POST", "path": "/api/payments/webhook", "headers": headers}, receive)


def session_event(event_id: str, event_type: str, payment: Payment) -> dict:
    return {
        "id": event_id,
        "object": "event",
        "type": event_type,
        "data": {"object": {
            "id": payment.provider_payment_id,
            "object": "checkout.session",
            "metadata": {"payment_id": str(payment.id)},
            "payment_status": "unpaid",
        }},
    }


async def test_signed_expired_event_cancels_website_order_once_and_restores_stock(session):
    product, inventory = await published_product(session)
    result = await checkout(session, checkout_body(product.id))
    payment = await session.scalar(select(Payment).where(Payment.order_id == result.order_number))
    event = session_event("evt_fictional_expired", "checkout.session.expired", payment)

    first = await payment_routes.stripe_webhook(signed_webhook_request(event), session)
    duplicate = await payment_routes.stripe_webhook(signed_webhook_request(event), session)

    assert first["message"] == "Payment expired."
    assert duplicate["message"] == "Event already processed."
    order = await session.get(Order, result.order_number, populate_existing=True)
    assert order.status == "CANCELLED"
    await session.refresh(inventory)
    assert inventory.quantity == 5


async def test_signed_async_failure_marks_payment_failed_and_releases_stock(session):
    product, inventory = await published_product(session)
    result = await checkout(session, checkout_body(product.id))
    payment = await session.scalar(select(Payment).where(Payment.order_id == result.order_number))

    response = await payment_routes.stripe_webhook(
        signed_webhook_request(session_event("evt_fictional_failed", "checkout.session.async_payment_failed", payment)),
        session,
    )

    assert response["message"] == "Payment failed."
    await session.refresh(payment)
    assert payment.status == "FAILED"
    order = await session.get(Order, result.order_number, populate_existing=True)
    assert order.status == "CANCELLED" and order.payment_status == "FAILED"
    await session.refresh(inventory)
    assert inventory.quantity == 5


async def test_webhook_rejects_a_forged_signature(session):
    event = {"id": "evt_forged", "object": "event", "type": "checkout.session.completed", "data": {"object": {}}}
    forged = signed_webhook_request(event)
    forged.scope["headers"] = [(b"stripe-signature", f"t={int(time.time())},v1=deadbeef".encode())]
    with pytest.raises(HTTPException) as error:
        await payment_routes.stripe_webhook(forged, session)
    assert error.value.status_code == 400


async def test_sweep_cancels_only_stale_unpaid_website_orders(session):
    product, inventory = await published_product(session, quantity=10)
    stale = await checkout(session, checkout_body(product.id, quantity=1), key="fictional-key-stale")
    fresh = await checkout(session, checkout_body(product.id, quantity=1), key="fictional-key-fresh")
    customer = await session.scalar(select(Customer))
    admin_order = Order(customer_id=customer.id, status="PENDING", payment_status="UNPAID", total_amount=Decimal("20.00"))
    session.add(admin_order)
    old = datetime.now(UTC) - timedelta(hours=2)
    (await session.get(Order, stale.order_number)).created_at = old
    admin_order.created_at = old
    await session.commit()

    assert await cancel_stale_storefront_orders(session) == 1

    statuses = {order.id: order.status for order in (await session.scalars(select(Order).execution_options(populate_existing=True))).all()}
    assert statuses[stale.order_number] == "CANCELLED"
    assert statuses[fresh.order_number] == "PENDING"
    assert statuses[admin_order.id] == "PENDING"
    await session.refresh(inventory)
    assert inventory.quantity == 9


async def test_postgres_two_checkouts_for_the_last_unit_sell_it_once(session):
    if session.get_bind().dialect.name != "postgresql":
        pytest.skip("Requires disposable PostgreSQL")
    import asyncio

    from sqlalchemy.ext.asyncio import async_sessionmaker

    product, inventory = await published_product(session, quantity=1)
    factory = async_sessionmaker(session.bind, expire_on_commit=False)

    async def attempt(key: str, phone: str):
        async with factory() as db:
            try:
                await storefront_checkout(checkout_body(product.id, quantity=1, phone_number=phone), request(), db, Response(), key)
                return True
            except HTTPException:
                return False

    results = await asyncio.gather(attempt("fictional-race-0001", "0120000001"), attempt("fictional-race-0002", "0120000002"))

    assert sorted(results) == [False, True]
    await session.refresh(inventory)
    assert inventory.quantity == 0
    assert await session.scalar(select(func.count(Order.id))) == 1
