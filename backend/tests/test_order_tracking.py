"""Guest order tracking with fictional customers and a fake payment provider."""

import itertools
import sqlite3
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from sqlalchemy import select
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.storefront import lookup_storefront_order, storefront_checkout, track_storefront_order
from app.core.config import settings
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_tracking_token import OrderTrackingToken
from app.models.product import Product
from app.schemas.storefront import StorefrontCheckoutRequest, StorefrontOrderLookupRequest
from app.services.delivery_services import update_delivery_status
from app.services.order_services import cancel_order, create_order
from app.services.order_tracking import TRACKING_RETENTION_DAYS, hash_tracking_token, is_trackable

client_ips = itertools.count(1)


def request() -> Request:
    # A fresh fictional address per call keeps the in-memory rate limiter out of the way.
    return Request({"type": "http", "method": "GET", "path": "/", "headers": [], "client": (f"10.1.0.{next(client_ips) % 250}", 1234)})


class FakeProvider:
    name = "stripe"

    async def create_payment(self, *, payment_id, **kwargs):
        return {"provider_payment_id": f"cs_test_fictional_{payment_id}", "payment_url": f"https://checkout.example.invalid/{payment_id}"}

    async def expire_payment(self, provider_payment_id):
        return None


@pytest.fixture(autouse=True)
def checkout_enabled(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_CHECKOUT_ENABLED", True)
    monkeypatch.setattr("app.payments.service.get_payment_provider", lambda _name: FakeProvider())


async def published_product(session) -> Product:
    product = Product(name="Fictional bahulu", name_ms="Bahulu rekaan", price=Decimal("20.00"), is_active=True, storefront_published=True)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=10, low_stock_threshold=1))
    await session.commit()
    return product


def checkout_body(product_id: int) -> StorefrontCheckoutRequest:
    return StorefrontCheckoutRequest.model_validate({
        "items": [{"product_id": product_id, "quantity": 2}],
        "contact": {
            "full_name": "Fictional Buyer", "phone_number": "012-345 6789", "email": "buyer@example.com",
            "address": "1 Jalan Rekaan", "city": "Tanah Rata", "state": "Pahang", "postal_code": "39000",
        },
        "locale": "en",
        "privacy_notice_accepted": True,
    })


async def place_order(session, key: str = "fictional-track-0001"):
    product = await published_product(session)
    return await storefront_checkout(checkout_body(product.id), request(), session, Response(), key)


async def track(session, token: str):
    return await track_storefront_order(token, request(), session, Response())


async def lookup(session, order_number: int, phone: str):
    body = StorefrontOrderLookupRequest(order_number=order_number, phone_number=phone)
    return await lookup_storefront_order(body, request(), session, Response())


async def assert_not_found(call):
    with pytest.raises(HTTPException) as error:
        await call
    assert error.value.status_code == 404
    return error.value.detail


async def test_checkout_returns_a_token_and_stores_only_its_hash(session):
    result = await place_order(session)

    order = await session.get(Order, result.order_number)
    assert result.tracking_token
    stored = (await session.scalars(select(OrderTrackingToken.token_hash).where(OrderTrackingToken.order_id == order.id))).all()
    assert stored == [hash_tracking_token(result.tracking_token)]
    assert result.tracking_token not in stored[0]

    view = await track(session, result.tracking_token)
    assert view.order_number == order.id
    assert view.status == "PENDING" and view.payment_status == "UNPAID"
    assert view.items[0].name_ms == "Bahulu rekaan" and view.items[0].quantity == 2
    assert view.total_amount == Decimal("40.00")


async def test_view_exposes_no_address_email_or_full_phone(session):
    result = await place_order(session)

    view = await track(session, result.tracking_token)

    assert view.recipient_first_name == "Fictional"
    assert view.phone_last_digits == "6789"
    assert set(view.model_dump()) == {
        "order_number", "created_at", "closed_at", "status", "payment_status", "items",
        "subtotal", "discount_amount", "total_amount", "delivery",
        "recipient_first_name", "phone_last_digits",
    }
    dumped = view.model_dump_json()
    for private in ("Jalan Rekaan", "39000", "buyer@example.com", "123456789", "checkout.example.invalid", "cs_test"):
        assert private not in dumped


async def test_retry_adds_a_new_link_and_keeps_the_first(session):
    first = await place_order(session)
    product_id = (await session.scalar(select(Product.id)))
    again = await storefront_checkout(checkout_body(product_id), request(), session, Response(), "fictional-track-0001")

    assert again.order_number == first.order_number
    assert again.tracking_token != first.tracking_token
    assert (await track(session, first.tracking_token)).order_number == first.order_number
    assert (await track(session, again.tracking_token)).order_number == first.order_number


@pytest.mark.parametrize("token", ["", "short", "x" * 43, "not a token!" * 4])
async def test_unknown_or_malformed_tokens_are_not_found(session, token):
    await place_order(session)
    await assert_not_found(track(session, token))


async def test_tracking_expires_after_the_retention_window(session):
    result = await place_order(session)
    order = await session.get(Order, result.order_number)
    closed = datetime.now(UTC) - timedelta(days=10)
    order.closed_at = closed

    assert is_trackable(order, closed + timedelta(days=TRACKING_RETENTION_DAYS))
    assert not is_trackable(order, closed + timedelta(days=TRACKING_RETENTION_DAYS, seconds=1))

    order.closed_at = datetime.now(UTC) - timedelta(days=TRACKING_RETENTION_DAYS + 1)
    await session.commit()
    await assert_not_found(track(session, result.tracking_token))
    await assert_not_found(lookup(session, result.order_number, "012-345 6789"))


async def test_cancel_sets_closed_at(session):
    result = await place_order(session)

    outcome = await cancel_order(session, result.order_number)

    assert outcome["success"]
    order = await session.get(Order, result.order_number)
    assert order.status == "CANCELLED" and order.closed_at is not None
    view = await track(session, result.tracking_token)
    assert view.status == "CANCELLED"


async def test_delivered_completes_the_order_and_sets_closed_at(session):
    result = await place_order(session)
    order = await session.get(Order, result.order_number)
    order.payment_status = "PAID"
    order.status = "SHIPPED"
    # Dispatch has its own staff action; start from an already-shipped parcel.
    delivery = await session.scalar(select(Delivery).where(Delivery.order_id == order.id))
    delivery.status = "SHIPPED"
    await session.commit()

    await update_delivery_status(session, order.id, "DELIVERED")
    await session.commit()

    await session.refresh(order)
    assert order.status == "COMPLETED" and order.closed_at is not None
    view = await track(session, result.tracking_token)
    assert view.delivery.status == "DELIVERED"


async def test_lookup_finds_the_order_with_any_phone_format(session):
    result = await place_order(session)

    for phone in ("012-345 6789", "0123456789", "+60123456789"):
        view = await lookup(session, result.order_number, phone)
        assert view.order_number == result.order_number


async def test_lookup_misses_all_look_the_same(session):
    result = await place_order(session)
    product_id = await session.scalar(select(Product.id))
    customer_id = await session.scalar(select(Customer.id))
    admin_order = await create_order(session, customer_id, [{"product_id": product_id, "quantity": 1}], source="ADMIN")
    await session.commit()

    details = {
        await assert_not_found(lookup(session, result.order_number, "012-999 9999")),
        await assert_not_found(lookup(session, result.order_number, "not a phone")),
        await assert_not_found(lookup(session, result.order_number + 999, "012-345 6789")),
        await assert_not_found(lookup(session, admin_order["order"]["id"], "012-345 6789")),
    }
    assert len(details) == 1


async def test_lookup_is_rate_limited(session):
    result = await place_order(session)
    body = StorefrontOrderLookupRequest(order_number=result.order_number, phone_number="012-999 9999")
    same_client = Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": ("10.2.0.1", 1234)})

    for _ in range(10):
        await assert_not_found(lookup_storefront_order(body, same_client, session, Response()))
    with pytest.raises(HTTPException) as error:
        await lookup_storefront_order(body, same_client, session, Response())
    assert error.value.status_code == 429


async def test_tracking_is_hidden_when_checkout_is_disabled(session, monkeypatch):
    result = await place_order(session)
    monkeypatch.setattr(settings, "STOREFRONT_CHECKOUT_ENABLED", False)

    assert await assert_not_found(track(session, result.tracking_token)) == "Not found."
    assert await assert_not_found(lookup(session, result.order_number, "012-345 6789")) == "Not found."


async def test_delivery_details_appear_in_the_timeline(session):
    result = await place_order(session)
    delivery = await session.scalar(select(Delivery).where(Delivery.order_id == result.order_number))
    delivery.courier = "Fictional Courier"
    delivery.tracking_number = "FICT123"
    await session.commit()

    view = await track(session, result.tracking_token)

    assert view.delivery.courier == "Fictional Courier"
    assert view.delivery.tracking_number == "FICT123"


def test_migration_adds_tracking_columns_backfills_and_rolls_back(tmp_path, monkeypatch):
    database = tmp_path / "tracking.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))

    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0032_support_drafts');
            CREATE TABLE orders (id INTEGER PRIMARY KEY, status VARCHAR(50), updated_at DATETIME);
            INSERT INTO orders VALUES (1, 'COMPLETED', '2026-09-01 10:00:00'), (2, 'PENDING', '2026-09-02 10:00:00');
            """
        )

    command.upgrade(config, "0033_order_tracking")
    with sqlite3.connect(database) as connection:
        rows = connection.execute("SELECT id, closed_at, tracking_token_hash FROM orders ORDER BY id").fetchall()
    assert rows == [(1, "2026-09-01 10:00:00", None), (2, None, None)]

    command.downgrade(config, "0032_support_drafts")
    with sqlite3.connect(database) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(orders)")}
    assert columns == {"id", "status", "updated_at"}


def test_public_order_lookup_needs_no_admin_csrf_token():
    # The storefront has no admin session, so the admin CSRF check must not
    # block this route (the storefront proxy checks the Origin instead).
    from app.core.security import verify_csrf_request

    lookup_request = Request({"type": "http", "method": "POST", "path": "/api/storefront/orders/lookup", "headers": []})
    verify_csrf_request(lookup_request)
