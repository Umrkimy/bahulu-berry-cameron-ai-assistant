from starlette.requests import Request

from app.core.security import create_csrf_token, verify_csrf_request


def make_request(method: str, csrf_cookie: str | None = None, csrf_header: str | None = None) -> Request:
    headers = []
    if csrf_header:
        headers.append((b"x-csrf-token", csrf_header.encode()))
    if csrf_cookie:
        headers.append((b"cookie", f"bbc_csrf_token={csrf_cookie}".encode()))
    return Request({"type": "http", "method": method, "path": "/api/customers/", "headers": headers})


def test_csrf_allows_safe_requests_and_matching_tokens():
    verify_csrf_request(make_request("GET"))
    token = create_csrf_token()
    verify_csrf_request(make_request("POST", token, token))


def test_csrf_rejects_missing_or_mismatched_tokens():
    try:
        verify_csrf_request(make_request("POST"))
    except Exception as error:
        assert error.status_code == 403
    else:
        raise AssertionError("Missing CSRF token should be rejected.")

    try:
        verify_csrf_request(make_request("POST", "cookie-token", "header-token"))
    except Exception as error:
        assert error.status_code == 403
    else:
        raise AssertionError("Mismatched CSRF token should be rejected.")


def test_csrf_requires_an_allowed_origin_in_staging(monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ENVIRONMENT", "staging")
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", ["https://demo.example.invalid"])
    token = create_csrf_token()
    request = make_request("POST", token, token)

    try:
        verify_csrf_request(request)
    except Exception as error:
        assert error.status_code == 403
    else:
        raise AssertionError("A staging request without an allowed Origin should be rejected.")

    allowed = make_request("POST", token, token)
    allowed.scope["headers"].append((b"origin", b"https://demo.example.invalid"))
    verify_csrf_request(allowed)
