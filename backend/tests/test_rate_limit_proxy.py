import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core.config import settings
from app.core.rate_limit import InMemoryRateLimiter, RateLimit


def request_for(client: str, forwarded_client: str | None = None) -> Request:
    headers = [] if forwarded_client is None else [(b"x-client-ip", forwarded_client.encode())]
    return Request({"type": "http", "method": "POST", "path": "/api/auth/token", "headers": headers, "client": (client, 12345)})


@pytest.mark.asyncio
async def test_rate_limiter_uses_socket_identity_when_cloudflare_proxy_mode_is_disabled(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_CLOUDFLARE_CLIENT_IP", False)
    limiter = InMemoryRateLimiter()
    limit = RateLimit(maximum=1, window_seconds=60)

    await limiter.check(request_for("172.20.0.3", "203.0.113.10"), "login", limit)
    with pytest.raises(HTTPException) as error:
        await limiter.check(request_for("172.20.0.3", "203.0.113.11"), "login", limit)

    assert error.value.status_code == 429
    assert error.value.headers == {"Retry-After": "60"}
    assert error.value.detail == {"message": "Too many requests. Please wait a moment and try again.", "retry_after_seconds": 60}


@pytest.mark.asyncio
async def test_rate_limiter_separates_valid_cloudflare_client_addresses(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_CLOUDFLARE_CLIENT_IP", True)
    limiter = InMemoryRateLimiter()
    limit = RateLimit(maximum=1, window_seconds=60)

    await limiter.check(request_for("172.20.0.3", "203.0.113.10"), "login", limit)
    await limiter.check(request_for("172.20.0.3", "203.0.113.11"), "login", limit)

    with pytest.raises(HTTPException) as error:
        await limiter.check(request_for("172.20.0.3", "203.0.113.10"), "login", limit)

    assert error.value.status_code == 429


@pytest.mark.asyncio
async def test_rate_limiter_falls_back_to_socket_identity_for_invalid_forwarded_address(monkeypatch):
    monkeypatch.setattr(settings, "TRUST_CLOUDFLARE_CLIENT_IP", True)
    limiter = InMemoryRateLimiter()
    limit = RateLimit(maximum=1, window_seconds=60)

    await limiter.check(request_for("172.20.0.3", "not-an-ip"), "login", limit)
    with pytest.raises(HTTPException):
        await limiter.check(request_for("172.20.0.3", "still-not-an-ip"), "login", limit)
