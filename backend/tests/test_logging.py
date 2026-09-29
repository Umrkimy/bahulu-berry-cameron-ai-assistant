import io
import json
import logging

import httpx
import pytest

from app.core.logging import (
    REDACTED,
    JsonFormatter,
    RedactionFilter,
    redact_text,
    request_id_var,
    safe_request_id,
)
from app.core.config import settings
from app.core.observability import init_sentry, scrub_event
from main import app


@pytest.fixture
def captured_logger():
    """A logger wired like production: redaction filter plus JSON formatter."""
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.addFilter(RedactionFilter())
    handler.setFormatter(JsonFormatter())
    logger = logging.getLogger("bahulu.test_logging")
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False
    yield logger, stream
    logger.removeHandler(handler)


def _lines(stream: io.StringIO) -> list[dict]:
    return [json.loads(line) for line in stream.getvalue().splitlines()]


@pytest.mark.parametrize(
    "raw",
    [
        "customer siti.aminah@example.com asked",
        "call +60 12-345 6789 today",
        "call 012-345 6789 today",
        "call 0123456789 today",
        "open https://wa.me/60123456789?text=hi",
        "landline 05-491 2345",
        "Authorization: Bearer abc.def.ghi",
        "cookie=bbc_admin_session=abcdef123456",
        "Set-Cookie: bbc_csrf_token=zzz; HttpOnly",
        "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl",
        "key sk_test_51Habcdefghijk",
        "secret whsec_abcdefghijk123",
        "GET /reset?token=abc123&x=1",
        "GET /callback?code=abc123",
    ],
)
def test_redact_text_masks_personal_data_and_secrets(raw):
    redacted = redact_text(raw)
    assert REDACTED in redacted
    for secret in ("siti.aminah", "345 6789", "3456789", "60123456789", "491 2345", "abc.def.ghi",
                   "abcdef123456", "zzz", "eyJhbGci", "sk_test_51H", "whsec_abc", "abc123"):
        assert secret not in redacted


@pytest.mark.parametrize(
    "safe",
    [
        "order 1042 moved to PAID on 2026-09-29",
        "GET /api/orders/12345 took 38 ms",
        "revision 0032_support_drafts",
    ],
)
def test_redact_text_leaves_ordinary_values(safe):
    assert redact_text(safe) == safe


def test_json_log_line_has_request_id_and_redacts_extras(captured_logger):
    logger, stream = captured_logger
    token = request_id_var.set("req-123")
    try:
        logger.info(
            "draft_saved for %s",
            "aminah@example.com",
            extra={"draft_id": 7, "message_text": "Nak order 2 kotak", "customer_phone": "0123456789",
                   "note": "reach me at 012-345 6789"},
        )
    finally:
        request_id_var.reset(token)

    [line] = _lines(stream)
    assert line["event"] == f"draft_saved for {REDACTED}"
    assert line["level"] == "INFO"
    assert line["request_id"] == "req-123"
    assert line["draft_id"] == 7
    assert line["message_text"] == REDACTED
    assert line["customer_phone"] == REDACTED
    assert "345 6789" not in line["note"]
    assert line["ts"].endswith("+08:00")


def test_exception_traceback_is_redacted(captured_logger):
    logger, stream = captured_logger
    try:
        raise ValueError("bad email aminah@example.com")
    except ValueError:
        logger.exception("lookup_failed")
    [line] = _lines(stream)
    assert line["exc_type"] == "ValueError"
    assert "aminah@example.com" not in line["traceback"]


@pytest.mark.parametrize(
    ("candidate", "accepted"),
    [
        ("abc-123_DEF.9", True),
        ("x" * 64, True),
        ("x" * 65, False),
        ("bad\nINFO forged line", False),
        ('"},{"level":"ERROR', False),
        ("", False),
        (None, False),
    ],
)
def test_safe_request_id(candidate, accepted):
    assert safe_request_id(candidate) == (candidate if accepted else None)


async def _client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")


async def test_request_id_is_echoed_or_replaced():
    async with await _client() as client:
        echoed = await client.get("/health", headers={"X-Request-ID": "support-case-42"})
        forged = await client.get("/health", headers={"X-Request-ID": "x" * 200})
        generated = await client.get("/health")
    assert echoed.headers["X-Request-ID"] == "support-case-42"
    assert forged.headers["X-Request-ID"] != "x" * 200
    assert len(forged.headers["X-Request-ID"]) == 36
    assert len(generated.headers["X-Request-ID"]) == 36


async def test_early_rejection_still_has_request_id_and_security_headers():
    async with await _client() as client:
        response = await client.post(
            "/api/support/drafts/1/reject",
            content=b"{}",
            headers={"Content-Length": str(settings.MAX_REQUEST_BODY_BYTES + 1), "X-Request-ID": "too-big-1"},
        )
    assert response.status_code == 413
    assert response.headers["X-Request-ID"] == "too-big-1"
    assert response.headers["X-Content-Type-Options"] == "nosniff"


async def test_request_log_is_structured_and_carries_no_query_string():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.addFilter(RedactionFilter())
    handler.setFormatter(JsonFormatter())
    api_logger = logging.getLogger("bahulu.api")
    api_logger.addHandler(handler)
    try:
        async with await _client() as client:
            await client.get("/health?token=secret-reset-value&email=aminah@example.com",
                             headers={"X-Request-ID": "log-check-1"})
    finally:
        api_logger.removeHandler(handler)

    entries = [entry for entry in _lines(stream) if entry["event"] == "request_completed"]
    assert entries, stream.getvalue()
    entry = entries[-1]
    assert entry["request_id"] == "log-check-1"
    assert entry["path"] == "/health"
    assert entry["status_code"] == 200
    assert "secret-reset-value" not in stream.getvalue()
    assert "aminah@example.com" not in stream.getvalue()


def test_sentry_is_off_without_dsn(monkeypatch):
    monkeypatch.setattr(settings, "SENTRY_DSN", settings.SENTRY_DSN.__class__(""))
    assert init_sentry() is False


def test_sentry_event_scrubber_removes_personal_data():
    event = {
        "message": "failed for aminah@example.com",
        "user": {"email": "aminah@example.com", "ip_address": "203.0.113.9"},
        "request": {
            "url": "https://api.example.invalid/api/auth/reset?token=abc123",
            "method": "POST",
            "headers": {"Cookie": "bbc_admin_session=abc", "Authorization": "Bearer abc"},
            "cookies": {"bbc_admin_session": "abc"},
            "data": {"password": "hunter2"},
            "query_string": "token=abc123",
        },
        "breadcrumbs": {"values": [{"message": "SELECT phone FROM customers"}]},
        "exception": {"values": [{
            "type": "ValueError",
            "value": "no customer 0123456789",
            "stacktrace": {"frames": [{"function": "lookup", "vars": {"phone": "0123456789"}}]},
        }]},
        "extra": {"customer_email": "aminah@example.com", "order_id": 9},
    }

    scrubbed = scrub_event(event)

    text = json.dumps(scrubbed)
    for leaked in ("aminah@example.com", "abc123", "hunter2", "bbc_admin_session", "0123456789", "203.0.113.9"):
        assert leaked not in text
    assert scrubbed["request"] == {"url": "https://api.example.invalid/api/auth/reset", "method": "POST"}
    assert scrubbed["extra"]["order_id"] == 9
