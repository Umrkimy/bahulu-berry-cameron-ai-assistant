import hashlib
import hmac

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services.messaging import MetaWhatsAppAdapter
from main import app


@pytest.fixture
def meta_settings(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_META_INBOUND_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_META_APP_SECRET", settings.SECRET_KEY.__class__("test-meta-app-secret"))
    monkeypatch.setattr(settings, "WHATSAPP_META_VERIFY_TOKEN", settings.SECRET_KEY.__class__("test-verify-token"))
    monkeypatch.setattr(settings, "WHATSAPP_META_PHONE_NUMBER_ID", "test-phone-id")


def _signature(body: bytes) -> str:
    digest = hmac.new(b"test-meta-app-secret", body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def test_meta_webhook_is_disabled_by_default(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_META_INBOUND_ENABLED", False)
    with TestClient(app) as client:
        assert client.get("/webhooks/meta/whatsapp").status_code == 404
        assert client.post("/webhooks/meta/whatsapp", content=b"{}").status_code == 404


def test_meta_webhook_verifies_challenge_and_rejects_bad_signature(meta_settings):
    with TestClient(app) as client:
        verified = client.get("/webhooks/meta/whatsapp", params={"hub.mode": "subscribe", "hub.verify_token": "test-verify-token", "hub.challenge": "challenge-value"})
        assert verified.status_code == 200
        assert verified.text == "challenge-value"
        assert client.post("/webhooks/meta/whatsapp", content=b"{}", headers={"X-Hub-Signature-256": "sha256=invalid"}).status_code == 403


def test_meta_webhook_accepts_only_signed_payload(meta_settings):
    body = b'{"entry":[{"changes":[{"value":{"metadata":{"phone_number_id":"test-phone-id"},"messages":[]}}]}]}'
    with TestClient(app) as client:
        response = client.post("/webhooks/meta/whatsapp", content=body, headers={"Content-Type": "application/json", "X-Hub-Signature-256": _signature(body)})
    assert response.status_code == 200
    assert response.json() == {"status": "accepted", "processed": 0}


def test_meta_adapter_normalizes_only_valid_text_messages(meta_settings):
    payload = {
        "entry": [{"changes": [{"value": {"metadata": {"phone_number_id": "test-phone-id"}, "messages": [
            {"id": "message-1", "from": "60100000001", "type": "text", "text": {"body": "  Hello  "}},
            {"id": "message-2", "from": "60100000001", "type": "image"},
            {"id": "message-3", "from": "60100000001", "type": "text", "text": {"body": "x"}},
        ]}}]}]
    }
    messages = MetaWhatsAppAdapter().normalize_inbound(payload)
    assert len(messages) == 1
    assert messages[0].provider == "META_WHATSAPP"
    assert messages[0].external_conversation_id == "test-phone-id:60100000001"
    assert messages[0].message == "Hello"
