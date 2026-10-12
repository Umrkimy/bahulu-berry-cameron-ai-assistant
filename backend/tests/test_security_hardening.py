import jwt
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.auth.jwt import ADMIN_AUDIENCE, create_access_token, verify_access_token
from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimit
from app.core.security import verify_csrf_request


def test_admin_tokens_carry_and_require_the_admin_audience():
    token = create_access_token({"sub": "1", "sv": 0})
    assert verify_access_token(token)["aud"] == ADMIN_AUDIENCE
    assert verify_access_token(token, audience="bahulu-customer") is None


def test_tokens_without_an_audience_are_rejected():
    legacy = jwt.encode({"sub": "1", "sv": 0, "exp": 4_102_444_800}, settings.SECRET_KEY.get_secret_value(), algorithm=settings.ALGORITHM)
    assert verify_access_token(legacy) is None


def test_customer_audience_tokens_never_pass_as_admin():
    token = create_access_token({"sub": "1", "sv": 0}, audience="bahulu-customer")
    assert verify_access_token(token) is None


@pytest.mark.asyncio
async def test_keyed_limit_applies_across_addresses():
    limiter = InMemoryRateLimiter()
    limit = RateLimit(maximum=2, window_seconds=60)
    await limiter.check_key("login-account:owner@example.com", limit)
    await limiter.check_key("login-account:owner@example.com", limit)
    with pytest.raises(HTTPException) as error:
        await limiter.check_key("login-account:owner@example.com", limit)
    assert error.value.status_code == 429


@pytest.mark.asyncio
async def test_stale_buckets_are_swept(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr("app.core.rate_limit.monotonic", lambda: clock[0])
    limiter = InMemoryRateLimiter()
    limit = RateLimit(maximum=5, window_seconds=60)
    for index in range(50):
        await limiter.check_key(f"scope:10.0.0.{index}", limit)
    assert len(limiter._requests) == 50
    clock[0] += limiter.SWEEP_INTERVAL_SECONDS + 61
    await limiter.check_key("scope:10.0.1.1", limit)
    assert list(limiter._requests) == ["scope:10.0.1.1"]


def _post(path: str, origin: str | None) -> Request:
    headers = [(b"origin", origin.encode())] if origin else []
    return Request({"type": "http", "method": "POST", "path": path, "headers": headers})


def test_exempt_browser_posts_reject_foreign_origins_in_production(monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", ["https://shop.example.com"])
    with pytest.raises(HTTPException) as error:
        verify_csrf_request(_post("/api/auth/token", "https://evil.example.net"))
    assert error.value.status_code == 403
    verify_csrf_request(_post("/api/auth/token", "https://shop.example.com"))
    # Server-side callers (the storefront server) and webhooks send no Origin.
    verify_csrf_request(_post("/api/storefront/quote", None))
    verify_csrf_request(_post("/api/payments/webhook", "https://evil.example.net"))
