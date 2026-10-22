"""Sending WhatsApp replies through Meta, against a fake transport with fictional numbers."""

import itertools
import json
import logging
from datetime import UTC, datetime, timedelta

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import select

from app.api.routes.support import approve_support_draft, claim_conversation, dashboard_reply
from app.core.config import settings
from app.models.admin import Admin
from app.models.messaging import MessagingConversation, MessagingEvent
from app.models.support_draft import SupportDraft
from app.schemas.messaging import DashboardReplyInput
from app.schemas.support import SupportDraftApproveInput
from app.services.messaging import MetaWhatsAppAdapter, NormalizedInboundMessage, OutboundSendError, apply_delivery_statuses, process_inbound_message

message_ids = itertools.count(1)
SENDER = "60100000009"


@pytest.fixture(autouse=True)
def meta_sending(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_RAG_ENABLED", False)
    monkeypatch.setattr(settings, "WHATSAPP_META_OUTBOUND_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_META_ACCESS_TOKEN", SecretStr("fictional-access-token"))
    monkeypatch.setattr(settings, "WHATSAPP_META_PHONE_NUMBER_ID", "fictional-phone-id")


@pytest.fixture
def whatsapp_log(caplog):
    logger = logging.getLogger("bahulu.whatsapp")
    level, disabled = logger.level, logger.disabled
    logger.setLevel(logging.WARNING)
    logger.disabled = False
    caplog.handler.setLevel(logging.WARNING)
    logger.addHandler(caplog.handler)
    yield caplog
    logger.removeHandler(caplog.handler)
    logger.setLevel(level)
    logger.disabled = disabled


@pytest.fixture
def sent(monkeypatch):
    calls: list[tuple[str, str]] = []

    async def fake_send(self, *, recipient: str, body: str) -> str:
        calls.append((recipient, body))
        return f"wamid.fictional-{len(calls)}"

    monkeypatch.setattr(MetaWhatsAppAdapter, "send_text", fake_send)
    return calls


async def inbound(session, text: str):
    message = NormalizedInboundMessage("META_WHATSAPP", f"wamid.in-{next(message_ids)}", f"fictional-phone-id:{SENDER}", SENDER, text, "AUTO")
    return await process_inbound_message(session, message=message)


async def owner(session) -> Admin:
    admin = Admin(username="send-owner", email="send-owner@example.com", password_hash="test", role="OWNER", is_active=True)
    session.add(admin)
    await session.commit()
    return admin


async def outbound_events(session) -> list[MessagingEvent]:
    return list((await session.scalars(select(MessagingEvent).where(MessagingEvent.direction == "OUTBOUND").order_by(MessagingEvent.id))).all())


@pytest.mark.asyncio
async def test_send_text_posts_to_the_graph_api_without_logging_the_token(whatsapp_log):
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"messages": [{"id": "wamid.fictional"}]})

    message_id = await MetaWhatsAppAdapter(transport=httpx.MockTransport(handler)).send_text(recipient=SENDER, body="Hello")

    assert message_id == "wamid.fictional"
    assert str(requests[0].url) == f"https://graph.facebook.com/{settings.WHATSAPP_META_GRAPH_VERSION}/fictional-phone-id/messages"
    assert requests[0].headers["Authorization"] == "Bearer fictional-access-token"
    assert json.loads(requests[0].content) == {"messaging_product": "whatsapp", "recipient_type": "individual", "to": SENDER, "type": "text", "text": {"preview_url": False, "body": "Hello"}}
    assert "fictional-access-token" not in whatsapp_log.text


@pytest.mark.asyncio
async def test_send_text_reports_rejections_without_the_response_body(whatsapp_log):
    transport = httpx.MockTransport(lambda request: httpx.Response(401, json={"error": {"message": "fictional detail"}}))
    with pytest.raises(OutboundSendError):
        await MetaWhatsAppAdapter(transport=transport).send_text(recipient=SENDER, body="Hello")
    assert "401" in whatsapp_log.text
    assert "fictional detail" not in whatsapp_log.text


@pytest.mark.asyncio
async def test_send_text_refuses_when_sending_is_off(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_META_OUTBOUND_ENABLED", False)
    with pytest.raises(OutboundSendError):
        await MetaWhatsAppAdapter(transport=httpx.MockTransport(lambda request: httpx.Response(200))).send_text(recipient=SENDER, body="Hello")


@pytest.mark.asyncio
async def test_menu_reply_is_sent_to_the_customer(session, sent):
    result = await inbound(session, "hi")

    assert sent == [(SENDER, result.reply)]
    [event] = await outbound_events(session)
    assert event.outcome == "SENT"
    assert event.external_message_id == "wamid.fictional-1"


@pytest.mark.asyncio
async def test_failed_send_is_recorded(session, monkeypatch):
    async def failing_send(self, *, recipient: str, body: str) -> str:
        raise OutboundSendError("WhatsApp did not accept the message.")

    monkeypatch.setattr(MetaWhatsAppAdapter, "send_text", failing_send)
    await inbound(session, "hi")

    [event] = await outbound_events(session)
    assert event.outcome == "SEND_FAILED"


@pytest.mark.asyncio
async def test_staff_reply_is_sent_after_claiming(session, sent):
    admin = await owner(session)
    await inbound(session, "hi")
    handoff = await inbound(session, "5")
    await claim_conversation(handoff.support_request_id, session, admin)

    event = await dashboard_reply(handoff.support_request_id, DashboardReplyInput(content="Hi, this is our staff."), session, admin)

    assert event.outcome == "SENT"
    assert sent[-1] == (SENDER, "Hi, this is our staff.")


@pytest.mark.asyncio
async def test_staff_reply_is_refused_outside_the_24_hour_window(session, sent):
    admin = await owner(session)
    await inbound(session, "hi")
    handoff = await inbound(session, "5")
    await claim_conversation(handoff.support_request_id, session, admin)
    for event in (await session.scalars(select(MessagingEvent).where(MessagingEvent.direction == "INBOUND"))).all():
        event.processed_at = datetime.now(UTC) - timedelta(hours=25)
    await session.commit()

    with pytest.raises(HTTPException) as error:
        await dashboard_reply(handoff.support_request_id, DashboardReplyInput(content="Late reply"), session, admin)

    assert error.value.status_code == 409
    assert ("60100000009", "Late reply") not in sent


@pytest.mark.asyncio
async def test_approving_a_draft_sends_it(session, sent):
    admin = await owner(session)
    await inbound(session, "hi")
    conversation = await session.scalar(select(MessagingConversation))
    draft = SupportDraft(conversation_id=conversation.id, language="EN", customer_message="Fictional question", body="Fictional approved answer.", source_ids=[], model="fictional", prompt_version="test")
    session.add(draft)
    await session.commit()

    approval = await approve_support_draft(draft.id, SupportDraftApproveInput(), session, admin)

    assert approval.sent is True
    assert sent[-1] == (SENDER, "Fictional approved answer.")


def status_payload(message_id: str, status: str, errors: list | None = None) -> dict:
    item = {"id": message_id, "status": status, "recipient_id": SENDER}
    if errors is not None:
        item["errors"] = errors
    return {"entry": [{"changes": [{"value": {"metadata": {"phone_number_id": "fictional-phone-id"}, "statuses": [item]}}]}]}


@pytest.mark.asyncio
async def test_delivery_statuses_move_forward_and_keep_failure_reason(session, sent):
    await inbound(session, "hi")
    adapter = MetaWhatsAppAdapter()

    await apply_delivery_statuses(session, adapter.delivery_statuses(status_payload("wamid.fictional-1", "read")))
    await apply_delivery_statuses(session, adapter.delivery_statuses(status_payload("wamid.fictional-1", "delivered")))
    [event] = await outbound_events(session)
    assert event.outcome == "READ"

    await apply_delivery_statuses(session, adapter.delivery_statuses(status_payload("wamid.fictional-1", "failed", [{"code": 131031, "title": "Business Account locked"}])))
    await session.refresh(event)
    assert event.outcome == "SEND_FAILED"
    assert event.delivery_error == "131031 Business Account locked"


@pytest.mark.asyncio
async def test_delivery_statuses_ignore_unknown_messages_and_other_numbers(session, sent):
    await inbound(session, "hi")
    adapter = MetaWhatsAppAdapter()
    other_number = status_payload("wamid.fictional-1", "read")
    other_number["entry"][0]["changes"][0]["value"]["metadata"]["phone_number_id"] = "someone-else"

    assert adapter.delivery_statuses(other_number) == []
    assert await apply_delivery_statuses(session, adapter.delivery_statuses(status_payload("wamid.unknown", "read"))) == 0
    [event] = await outbound_events(session)
    assert event.outcome == "SENT"
