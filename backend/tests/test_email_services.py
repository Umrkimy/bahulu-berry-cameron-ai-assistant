import logging

import httpx
import pytest
from pydantic import SecretStr

from app.models.admin import Admin
from app.services import email_services


def _admin() -> Admin:
    return Admin(id=1, username="owner", email="owner@example.com", password_hash="test", role="OWNER", is_active=True)


def _use_transport(monkeypatch, handler):
    real_client = httpx.AsyncClient
    monkeypatch.setattr(email_services.settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(email_services.settings, "RESEND_API_KEY", SecretStr("fictional-test-key"))
    monkeypatch.setattr(email_services.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **kwargs))


@pytest.mark.asyncio
async def test_rejected_email_logs_the_status_but_not_the_response_body(session, monkeypatch, caplog):
    _use_transport(monkeypatch, lambda request: httpx.Response(403, json={"message": "You can only send testing emails to owner@example.com"}))

    with caplog.at_level(logging.WARNING, logger=email_services.logger.name):
        record = await email_services.send_email(session, recipient=_admin(), email_type="PAYMENT_CONFIRMED", subject="Payment confirmed", body="Order #6 was paid.")

    assert record.status == "FAILED"
    assert "email_delivery_failed type=PAYMENT_CONFIRMED status=403" in caplog.text
    assert "owner@example.com" not in caplog.text


@pytest.mark.asyncio
async def test_network_failure_is_logged_as_network(session, monkeypatch, caplog):
    def fail(request):
        raise httpx.ConnectError("offline", request=request)

    _use_transport(monkeypatch, fail)

    with caplog.at_level(logging.WARNING, logger=email_services.logger.name):
        record = await email_services.send_email(session, recipient=_admin(), email_type="PAYMENT_CONFIRMED", subject="Payment confirmed", body="Order #6 was paid.")

    assert record.status == "FAILED"
    assert "status=network" in caplog.text
