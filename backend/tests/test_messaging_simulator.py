import pytest
from sqlalchemy import func, select

from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.messaging import MessagingEvent
from app.models.support import SupportFAQ
from app.services.messaging import NormalizedInboundMessage, process_inbound_message


async def _owner(session) -> Admin:
    owner = Admin(username="owner", email="owner@example.test", password_hash="test", role="OWNER", is_active=True)
    session.add(owner)
    await session.commit()
    await session.refresh(owner)
    return owner


@pytest.mark.asyncio
async def test_simulator_drafts_without_ticket_and_is_idempotent(session):
    owner = await _owner(session)
    session.add(SupportFAQ(category="greeting", question_en="Hello", answer_en="Hello from approved content.", is_active=True))
    await session.commit()
    message = NormalizedInboundMessage("SIMULATOR", "message-1", "conversation-1", "fictional-sender", "Hello", "EN")

    first = await process_inbound_message(session, message=message, actor=owner)
    second = await process_inbound_message(session, message=message, actor=owner)

    assert first.outcome == "DRAFTED"
    assert first.support_request_id is None
    assert first.draft and first.draft.reply == "Hello from approved content."
    assert second.duplicate is True
    assert await session.scalar(select(func.count()).select_from(MessagingEvent).where(MessagingEvent.external_message_id == "message-1")) == 1


@pytest.mark.asyncio
async def test_simulator_creates_and_reuses_safe_handoff_ticket(session):
    owner = await _owner(session)
    first = await process_inbound_message(session, message=NormalizedInboundMessage("SIMULATOR", "message-2", "conversation-2", "fictional-sender", "I need a human agent.", "EN"), actor=owner)
    second = await process_inbound_message(session, message=NormalizedInboundMessage("SIMULATOR", "message-3", "conversation-2", "fictional-sender", "My payment failed.", "EN"), actor=owner)

    assert first.outcome == "HANDOFF"
    assert first.ticket_created is True
    assert first.support_request_id is not None
    assert second.outcome == "HANDOFF"
    assert second.ticket_created is False
    assert second.support_request_id == first.support_request_id

    activities = (await session.execute(select(ActivityLog))).scalars().all()
    assert all("human agent" not in item.description.lower() and "payment failed" not in item.description.lower() for item in activities)
    assert all("human agent" not in str(item.metadata_json).lower() and "payment failed" not in str(item.metadata_json).lower() for item in activities)
