from collections import defaultdict, deque
from dataclasses import dataclass
from time import monotonic

from fastapi import HTTPException, Request, status


@dataclass(frozen=True)
class RateLimit:
    maximum: int
    window_seconds: int


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    async def check(self, request: Request, scope: str, limit: RateLimit) -> None:
        client = request.client.host if request.client else "unknown"
        key = f"{scope}:{client}"
        now = monotonic()
        timestamps = self._requests[key]
        while timestamps and timestamps[0] <= now - limit.window_seconds:
            timestamps.popleft()
        if len(timestamps) >= limit.maximum:
            retry_after = max(1, int(limit.window_seconds - (now - timestamps[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please wait a moment and try again.",
                headers={"Retry-After": str(retry_after)},
            )
        timestamps.append(now)


rate_limiter = InMemoryRateLimiter()
LOGIN_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
AI_LIMIT = RateLimit(maximum=30, window_seconds=5 * 60)
PAYMENT_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
REFUND_LIMIT = RateLimit(maximum=10, window_seconds=15 * 60)
PASSWORD_RESET_LIMIT = RateLimit(maximum=5, window_seconds=15 * 60)
