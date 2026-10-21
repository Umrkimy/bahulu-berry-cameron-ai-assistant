"""Customer accounts end to end over HTTP, with fictional customers only."""

import itertools
from decimal import Decimal

import httpx
import pytest

from app.auth.jwt import create_access_token
from app.core.config import settings
from app.core.rate_limit import rate_limiter
from app.db.database import get_db
from app.models.customer import Customer
from app.models.order import Order
from main import app

sent_emails: list[dict] = []
phones = itertools.count(1_000_000)


@pytest.fixture(autouse=True)
def accounts_enabled(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_ACCOUNTS_ENABLED", True)
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    rate_limiter._requests.clear()
    sent_emails.clear()

    async def capture(**email):
        sent_emails.append(email)
        return "SENT", None

    monkeypatch.setattr("app.services.customer_accounts.deliver_email", capture)


@pytest.fixture
async def client(session):
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as http:
            yield http
    finally:
        app.dependency_overrides.pop(get_db, None)


async def sign_in(client, email: str = "buyer@example.com") -> str:
    code = (await client.post("/api/storefront/account/code", json={"email": email})).json()["demo_code"]
    response = await client.post("/api/storefront/account/code/verify", json={"email": email, "code": code})
    assert response.status_code == 200
    return response.json()["session_token"]


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_accounts_are_hidden_until_enabled(client, monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_ACCOUNTS_ENABLED", False)
    response = await client.post("/api/storefront/account/code", json={"email": "buyer@example.com"})
    assert response.status_code == 404


async def test_code_request_reveals_nothing_and_emails_the_code(client):
    response = await client.post("/api/storefront/account/code", json={"email": "Buyer@Example.com", "locale": "ms"})
    assert response.status_code == 200
    body = response.json()
    assert body["message"].startswith("If that email can receive messages")
    assert len(sent_emails) == 1
    assert sent_emails[0]["to_address"] == "buyer@example.com"
    assert body["demo_code"] in sent_emails[0]["html"]
    assert "Kod log masuk" in sent_emails[0]["subject"]


@pytest.mark.parametrize(("environment", "provider"), [("staging", "console"), ("production", "resend"), ("development", "resend")])
async def test_demo_code_is_never_returned_outside_local_console_mode(client, monkeypatch, environment, provider):
    monkeypatch.setattr(settings, "ENVIRONMENT", environment)
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", provider)
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", [])
    response = await client.post("/api/storefront/account/code", json={"email": "buyer@example.com"})
    assert response.json()["demo_code"] is None


async def test_wrong_codes_are_limited_and_then_the_code_dies(client):
    code = (await client.post("/api/storefront/account/code", json={"email": "buyer@example.com"})).json()["demo_code"]
    wrong = f"{(int(code) + 1) % 1_000_000:06d}"
    for _ in range(5):
        response = await client.post("/api/storefront/account/code/verify", json={"email": "buyer@example.com", "code": wrong})
        assert response.status_code == 400
    rate_limiter._requests.clear()
    response = await client.post("/api/storefront/account/code/verify", json={"email": "buyer@example.com", "code": code})
    assert response.status_code == 400


async def test_only_the_newest_code_works(client):
    first = (await client.post("/api/storefront/account/code", json={"email": "buyer@example.com"})).json()["demo_code"]
    await client.post("/api/storefront/account/code", json={"email": "buyer@example.com"})
    response = await client.post("/api/storefront/account/code/verify", json={"email": "buyer@example.com", "code": first})
    assert response.status_code == 400


async def test_code_sign_in_creates_the_account_and_session(client):
    token = await sign_in(client)
    me = await client.get("/api/storefront/account/me", headers=bearer(token))
    assert me.status_code == 200
    assert me.json()["email"] == "buyer@example.com"
    assert me.json()["has_password"] is False
    assert (await client.get("/api/storefront/account/me")).status_code == 401


async def test_customer_and_admin_sessions_never_cross(client):
    customer_token = await sign_in(client)
    client.cookies.set(settings.SESSION_COOKIE_NAME, customer_token)
    assert (await client.get("/api/auth/me")).status_code == 401
    client.cookies.clear()
    admin_token = create_access_token({"sub": "1", "sv": 0})
    assert (await client.get("/api/storefront/account/me", headers=bearer(admin_token))).status_code == 401


async def test_password_can_be_set_then_used_and_changes_need_the_current_one(client):
    token = await sign_in(client)
    response = await client.post("/api/storefront/account/password", headers=bearer(token), json={"new_password": "fictional-pass-1"})
    assert response.status_code == 200
    # The old session was signed out; the returned one works.
    assert (await client.get("/api/storefront/account/me", headers=bearer(token))).status_code == 401
    assert (await client.get("/api/storefront/account/me", headers=bearer(response.json()["session_token"]))).status_code == 200

    bad = await client.post("/api/storefront/account/password/sign-in", json={"email": "buyer@example.com", "password": "nope-nope"})
    unknown = await client.post("/api/storefront/account/password/sign-in", json={"email": "nobody@example.com", "password": "nope-nope"})
    assert bad.status_code == unknown.status_code == 400
    assert bad.json() == unknown.json()

    signed_in = await client.post("/api/storefront/account/password/sign-in", json={"email": "buyer@example.com", "password": "fictional-pass-1"})
    password_token = signed_in.json()["session_token"]
    change = await client.post("/api/storefront/account/password", headers=bearer(password_token), json={"new_password": "fictional-pass-2"})
    assert change.status_code == 400
    change = await client.post(
        "/api/storefront/account/password", headers=bearer(password_token),
        json={"new_password": "fictional-pass-2", "current_password": "fictional-pass-1"},
    )
    assert change.status_code == 200


async def test_sign_out_ends_every_session(client):
    token = await sign_in(client)
    assert (await client.post("/api/storefront/account/sign-out", headers=bearer(token))).status_code == 204
    assert (await client.get("/api/storefront/account/me", headers=bearer(token))).status_code == 401


async def test_profile_validates_phone_numbers(client):
    token = await sign_in(client)
    ok = await client.patch("/api/storefront/account/me", headers=bearer(token), json={"full_name": "Fictional Buyer", "phone_number": "012-345 6789", "locale": "ms"})
    assert ok.status_code == 200
    assert ok.json()["locale"] == "ms"
    bad = await client.patch("/api/storefront/account/me", headers=bearer(token), json={"phone_number": "not a phone"})
    assert bad.status_code == 422


async def fictional_order(session, *, email: str | None, customer_email: str | None = None, source: str = "STOREFRONT") -> Order:
    phone = f"012{next(phones)}"
    customer = Customer(full_name="Fictional Buyer", phone_number=phone, canonical_phone_number=phone, canonical_email=customer_email)
    session.add(customer)
    await session.flush()
    order = Order(
        customer_id=customer.id, status="PENDING", payment_status="PAID", source=source,
        subtotal=Decimal("20.00"), discount_amount=Decimal("0.00"), total_amount=Decimal("20.00"), contact_email=email,
    )
    session.add(order)
    await session.commit()
    return order


async def test_my_orders_only_shows_website_orders_for_the_verified_email(client, session):
    mine = await fictional_order(session, email="buyer@example.com")
    via_customer = await fictional_order(session, email=None, customer_email="buyer@example.com")
    await fictional_order(session, email="someone@example.com")
    await fictional_order(session, email="buyer@example.com", source="WHATSAPP")
    token = await sign_in(client)
    orders = (await client.get("/api/storefront/account/orders", headers=bearer(token))).json()["orders"]
    assert sorted(order["order_number"] for order in orders) == sorted([mine.id, via_customer.id])

    export = (await client.get("/api/storefront/account/export", headers=bearer(token))).json()
    assert export["account"]["email"] == "buyer@example.com"
    assert len(export["orders"]) == 2


async def test_deleting_needs_the_email_and_ends_the_session(client, session):
    order = await fictional_order(session, email="buyer@example.com")
    token = await sign_in(client)
    wrong = await client.post("/api/storefront/account/delete", headers=bearer(token), json={"confirm_email": "other@example.com"})
    assert wrong.status_code == 400
    done = await client.post("/api/storefront/account/delete", headers=bearer(token), json={"confirm_email": "BUYER@example.com"})
    assert done.status_code == 204
    assert (await client.get("/api/storefront/account/me", headers=bearer(token))).status_code == 401
    # The bakery keeps its order record.
    assert await session.get(Order, order.id) is not None
