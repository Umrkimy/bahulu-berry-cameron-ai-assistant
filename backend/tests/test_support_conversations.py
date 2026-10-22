"""The WhatsApp inbox list, with fictional numbers and messages."""

import itertools

import pytest
from fastapi import HTTPException

from app.api.routes.support import conversation_messages, conversations
from app.core.config import settings
from app.models.admin import Admin
from app.services.messaging import NormalizedInboundMessage, process_inbound_message

message_ids = itertools.count(1)


@pytest.fixture(autouse=True)
def menu_enabled(monkeypatch):
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", True)
    monkeypatch.setattr(settings, "WHATSAPP_RAG_ENABLED", False)


async def staff(session) -> Admin:
    admin = Admin(username="inbox-staff", email="inbox-staff@example.com", password_hash="test", role="STAFF", is_active=True)
    session.add(admin)
    await session.commit()
    return admin


async def send(session, text: str, conversation: str, sender: str):
    message = NormalizedInboundMessage("SIMULATOR", f"inbox-message-{next(message_ids)}", conversation, sender, text, "AUTO")
    return await process_inbound_message(session, message=message)


@pytest.mark.asyncio
async def test_inbox_lists_menu_only_and_handoff_conversations_newest_first(session):
    admin = await staff(session)
    await send(session, "hi", "conversation-menu", "60100000001")
    await send(session, "hi", "conversation-staff", "60100000002")
    handoff = await send(session, "5", "conversation-staff", "60100000002")

    page = await conversations(session, admin)

    assert page.total == 2
    first, second = page.items
    assert first.contact_reference == "60100000002"
    assert first.handoff_state == "HUMAN_REQUESTED"
    assert first.support_request_id == handoff.support_request_id
    assert first.last_direction == "OUTBOUND"
    assert first.last_message.startswith("Thanks! Our staff will reply here")
    assert second.handoff_state == "AI_ACTIVE"
    assert second.support_request_id is None
    assert second.language == "EN"


@pytest.mark.asyncio
async def test_needs_attention_shows_only_conversations_waiting_for_staff(session):
    admin = await staff(session)
    await send(session, "hi", "conversation-menu", "60100000001")
    await send(session, "live agent please", "conversation-staff", "60100000002")

    page = await conversations(session, admin, needs_attention=True)

    assert [item.contact_reference for item in page.items] == ["60100000002"]


@pytest.mark.asyncio
async def test_conversation_messages_show_customer_and_berry_in_order(session):
    admin = await staff(session)
    await send(session, "hi", "conversation-menu", "60100000001")
    await send(session, "4", "conversation-menu", "60100000001")
    conversation_id = (await conversations(session, admin)).items[0].id

    messages = await conversation_messages(conversation_id, session, admin)

    assert [(message.direction, message.outcome) for message in messages] == [("INBOUND", "MENU"), ("OUTBOUND", "AUTO_REPLY"), ("INBOUND", "MENU"), ("OUTBOUND", "AUTO_REPLY")]
    assert messages[2].content == "4"


@pytest.mark.asyncio
async def test_unknown_conversation_is_not_found(session):
    admin = await staff(session)
    with pytest.raises(HTTPException) as error:
        await conversation_messages(999, session, admin)
    assert error.value.status_code == 404
