from collections import defaultdict, deque
from dataclasses import dataclass
from ipaddress import ip_address
from math import ceil
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import settings


@dataclass(frozen=True)
class RateLimit:
    maximum: int
    window_seconds: int


class InMemoryRateLimiter:
    # Visitors who stop sending requests leave empty buckets behind; sweep them
    # now and then so rotating addresses cannot grow memory without bound.
    SWEEP_INTERVAL_SECONDS = 300

    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)
        self._windows: dict[str, int] = {}
        self._last_sweep = monotonic()

    async def check(self, request: Request, scope: str, limit: RateLimit) -> None:
        await self.check_key(f"{scope}:{self._client_identity(request)}", limit)

    async def check_key(self, key: str, limit: RateLimit) -> None:
        """Limit by an explicit key, such as an account, regardless of address."""
        now = monotonic()
        self._sweep(now)
        self._windows[key] = limit.window_seconds
        timestamps = self._requests[key]
        while timestamps and timestamps[0] <= now - limit.window_seconds:
            timestamps.popleft()
        if len(timestamps) >= limit.maximum:
            retry_after = max(1, ceil(limit.window_seconds - (now - timestamps[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Too many requests. Please wait a moment and try again.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
        timestamps.append(now)

    def _sweep(self, now: float) -> None:
        if now - self._last_sweep < self.SWEEP_INTERVAL_SECONDS:
            return
        self._last_sweep = now
        for key in list(self._requests):
            timestamps = self._requests[key]
            if not timestamps or timestamps[-1] <= now - self._windows.get(key, 0):
                del self._requests[key]
                self._windows.pop(key, None)

    @staticmethod
    def _client_identity(request: Request) -> str:
        """Use Cloudflare's single client-IP header only when explicitly enabled.

        The dashboard API is private behind the internal frontend proxy. Local
        development deliberately keeps using the socket peer address, avoiding
        trust in browser-supplied forwarding headers.
        """
        if settings.TRUST_CLOUDFLARE_CLIENT_IP:
            forwarded_client = request.headers.get("X-Client-IP", "").strip()
            try:
                return str(ip_address(forwarded_client))
            except ValueError:
                pass
        return request.client.host if request.client else "unknown"


rate_limiter = InMemoryRateLimiter()
LOGIN_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
# Per account, across all addresses, so a botnet cannot spread guesses out.
LOGIN_ACCOUNT_LIMIT = RateLimit(maximum=20, window_seconds=15 * 60)
# Per address, so nobody can flood one inbox with reset or sign-in emails.
EMAIL_RECIPIENT_LIMIT = RateLimit(maximum=3, window_seconds=15 * 60)
AI_LIMIT = RateLimit(maximum=30, window_seconds=5 * 60)
STAFF_AI_LIMIT = RateLimit(maximum=10, window_seconds=5 * 60)
PAYMENT_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
REFUND_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
PASSWORD_RESET_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
PASSWORD_RESET_CONFIRM_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
STOREFRONT_READ_LIMIT = RateLimit(maximum=120, window_seconds=60)
STOREFRONT_CHECKOUT_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
STOREFRONT_TRACKING_LIMIT = RateLimit(maximum=60, window_seconds=60)
# Order number + phone guesses are the brute-force risk, so keep this tight.
STOREFRONT_TRACKING_LOOKUP_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
# Customer accounts: code requests and sign-in guesses per address, and a
# generous ceiling on signed-in account calls.
CUSTOMER_CODE_REQUEST_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
CUSTOMER_SIGN_IN_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
CUSTOMER_ACCOUNT_LIMIT = RateLimit(maximum=120, window_seconds=60)
