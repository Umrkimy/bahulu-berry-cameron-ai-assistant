import hmac
import secrets

from fastapi import HTTPException, Request, Response, status

from app.core.config import settings


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PATHS = {"/api/auth/csrf", "/api/auth/token", "/api/auth/password-reset/request", "/api/auth/password-reset/confirm", "/api/storefront/quote", "/api/storefront/checkout", "/api/storefront/orders/lookup", "/api/payments/webhook", "/webhooks/meta/whatsapp"}


def create_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_csrf_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.CSRF_COOKIE_NAME, value=token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        secure=settings.cookie_secure, httponly=False, samesite=settings.cookie_samesite, path="/",
    )


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME, value=token,
        max_age=settings.SESSION_EXPIRE_MINUTES * 60,
        secure=settings.cookie_secure, httponly=True, samesite=settings.cookie_samesite, path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(settings.SESSION_COOKIE_NAME, path="/")
    response.delete_cookie(settings.CSRF_COOKIE_NAME, path="/")


WEBHOOK_PATHS = {"/api/payments/webhook", "/webhooks/meta/whatsapp"}


# Customer account routes authenticate with a bearer header from the
# storefront server, which browsers never attach on their own.
CSRF_EXEMPT_PREFIXES = ("/api/storefront/account/",)


def verify_csrf_request(request: Request) -> None:
    if request.method in SAFE_METHODS:
        return
    if request.url.path in CSRF_EXEMPT_PATHS or request.url.path.startswith(CSRF_EXEMPT_PREFIXES):
        # Token-less browser forms (sign-in, reset) still must not be posted
        # from another site. Server-to-server callers send no Origin at all.
        origin = request.headers.get("origin")
        if (
            origin
            and request.url.path not in WEBHOOK_PATHS
            and settings.requires_strict_runtime_security
            and origin.rstrip("/") not in settings.ALLOWED_ORIGINS
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request was blocked for security reasons.")
        return
    cookie_token = request.cookies.get(settings.CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")
    if not cookie_token or not header_token or not hmac.compare_digest(cookie_token, header_token):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your security token is missing or expired. Refresh the page and try again.",
        )
    origin = request.headers.get("origin")
    if settings.requires_strict_runtime_security and (not origin or origin.rstrip("/") not in settings.ALLOWED_ORIGINS):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This request was blocked for security reasons.")
