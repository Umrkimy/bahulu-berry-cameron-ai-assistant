from collections import defaultdict, deque
from dataclasses import dataclass
from ipaddress import ip_address
from time import monotonic

from fastapi import HTTPException, Request, status

from app.core.config import settings


@dataclass(frozen=True)
class RateLimit:
    maximum: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    async def check(self, request: Request, scope: str, limit: RateLimit) -> None:
        client = self._client_identity(request)
        key = f"{scope}:{client}"
        now = monotonic()
        timestamps = self._requests[key]
        while timestamps and timestamps[0] <= now - limit.window_seconds:
            timestamps.popleft()
        if len(timestamps) >= limit.maximum:
            retry_after = max(1, int(limit.window_seconds - (now - timestamps[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "message": "Too many requests. Please wait a moment and try again.",
                    "retry_after_seconds": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )
        timestamps.append(now)

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
AI_LIMIT = RateLimit(maximum=30, window_seconds=5 * 60)
STAFF_AI_LIMIT = RateLimit(maximum=10, window_seconds=5 * 60)
PAYMENT_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
REFUND_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
PASSWORD_RESET_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
PASSWORD_RESET_CONFIRM_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
STOREFRONT_READ_LIMIT = RateLimit(maximum=120, window_seconds=60)
