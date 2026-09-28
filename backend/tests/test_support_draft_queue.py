from datetime import UTC, datetime, timedelta
from urllib.parse import unquote

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select

from app.api.routes import support as support_routes
from app.api.routes.support import approve_support_draft, create_support_draft, reject_support_draft, support_drafts
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.messaging import MessagingConversation
from app.models.support import SupportRequest
from app.models.support_draft import SupportDraft
from app.schemas.support import SupportDraftApproveInput, SupportDraftInput, SupportDraftPublic, SupportDraftSource
from app.services import messaging
from app.services.messaging import NormalizedInboundMessage, process_inbound_message, purge_expired_message_content

REPLY = "Pickup details are confirmed by our support team."


def _fake_draft(reply: str | None = REPLY, *, handoff: bool = False, cost: float = 0.0012) -> SupportDraftPublic:
    return SupportDraftPublic(
        reply=None if handoff else reply,
        language="EN",
        handoff_required=handoff,
        handoff_reason="Human assistance requested" if handoff else None,
        sources=[] if handoff else [SupportDraftSource(type="FAQ", id=1, label="What are your pickup options?", similarity=0.93)],
        prompt_version="test-v1",
        model="gpt-4o-mini",
        latency_ms=5,
        retrieval_mode="HANDOFF" if handoff else "SEMANTIC_RAG",
        estimated_cost_usd=cost,
    )


@pytest.fixture
def drafting(monkeypatch):
    replies: list[SupportDraftPublic] = []

    async def fake_create_grounded_draft(_db, *, message, requested_language):
        return replies.pop(0) if replies else _fake_draft()

    monkeypatch.setattr(messaging, "create_grounded_draft", fake_create_grounded_draft)
    monkeypatch.setattr(support_routes, "create_grounded_draft", fake_create_grounded_draft)
    return replies


async def _admin(session, username: str, role: str = "STAFF") -> Admin:
    admin = Admin(username=username, email=f"{username}@example.test", password_hash="test", role=role, is_active=True)
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin


def _inbound(message_id: str, text: str = "What are your pickup options?", conversation: str = "conversation-1") -> NormalizedInboundMessage:
    return NormalizedInboundMessage("SIMULATOR", message_id, conversation, "60123456789", text, "EN")


async def _drafts(session) -> list[SupportDraft]:
    return (await session.execute(select(SupportDraft).order_by(SupportDraft.id))).scalars().all()


@pytest.mark.asyncio
async def test_inbound_draft_is_saved_for_review_and_duplicates_do_not_repeat(session, drafting):
    owner = await _admin(session, "owner", "OWNER")

    result = await process_inbound_message(session, message=_inbound("m-1"), actor=owner)
    duplicate = await process_inbound_message(session, message=_inbound("m-1"), actor=owner)

    drafts = await _drafts(session)
    assert result.outcome == "DRAFTED"
    assert duplicate.duplicate is True
    assert len(drafts) == 1
    draft = drafts[0]
    assert result.draft is not None and result.draft.draft_id == draft.id
    assert draft.status == "PENDING_REVIEW"
    assert draft.body == REPLY
    assert draft.customer_message == "What are your pickup options?"
    assert draft.messaging_event_id is not None and draft.conversation_id is not None
    assert draft.support_request_id is None
    assert draft.source_ids == [{"type": "FAQ", "id": 1, "label": "What are your pickup options?"}]


@pytest.mark.asyncio
async def test_handoff_saves_no_draft_and_newer_draft_supersedes_older(session, drafting):
    owner = await _admin(session, "owner", "OWNER")
    drafting.append(_fake_draft(handoff=True))

    await process_inbound_message(session, message=_inbound("m-1", "I need a human agent.", "conversation-a"), actor=owner)
    assert await _drafts(session) == []

    await process_inbound_message(session, message=_inbound("m-2", conversation="conversation-b"), actor=owner)
    await process_inbound_message(session, message=_inbound("m-3", conversation="conversation-b"), actor=owner)
    await process_inbound_message(session, message=_inbound("m-4", conversation="conversation-c"), actor=owner)

    statuses = [draft.status for draft in await _drafts(session)]
    assert statuses == ["SUPERSEDED", "PENDING_REVIEW", "PENDING_REVIEW"]
    page = await support_drafts(session, owner)
    assert page.total == 2


@pytest.mark.asyncio
async def test_copilot_draft_is_saved_and_records_ledger_cost(session, drafting):
    staff = await _admin(session, "staff")
    ticket = SupportRequest(customer_name="Fictional Customer", contact="012-345 6789", source="MANUAL", subject="Pickup", priority="NORMAL", status="NEW")
    session.add(ticket)
    await session.commit()

    result = await create_support_draft(SupportDraftInput(message="Pickup options?", language="EN", support_request_id=ticket.id), session, staff)

    drafts = await _drafts(session)
    assert len(drafts) == 1 and drafts[0].support_request_id == ticket.id and result.draft_id == drafts[0].id
    activity = await session.scalar(select(ActivityLog).where(ActivityLog.action == "drafted"))
    assert activity.metadata_json["estimated_cost_usd"] == pytest.approx(0.0012)
    assert activity.metadata_json["estimated_cost_rm"] == pytest.approx(0.0012 * support_routes.settings.AI_DISPLAY_EXCHANGE_RATE)
    assert activity.metadata_json["draft_id"] == drafts[0].id


@pytest.mark.asyncio
async def test_approve_returns_text_and_prefilled_whatsapp_link_once(session, drafting):
    staff = await _admin(session, "staff")
    await process_inbound_message(session, message=_inbound("m-1"), actor=staff)
    draft = (await _drafts(session))[0]

    approval = await approve_support_draft(draft.id, SupportDraftApproveInput(), session, staff)

    assert approval.text == REPLY
    assert approval.draft.status == "APPROVED"
    assert approval.draft.reviewed_by_admin_id == staff.id
    assert approval.whatsapp_url is not None and approval.whatsapp_url.startswith("https://wa.me/60123456789?text=")
    assert unquote(approval.whatsapp_url.split("text=", 1)[1]) == REPLY
    with pytest.raises(HTTPException) as error:
        await approve_support_draft(draft.id, SupportDraftApproveInput(), session, staff)
    assert error.value.status_code == 409
    assert await session.scalar(select(func.count()).select_from(ActivityLog).where(ActivityLog.action == "draft_approved")) == 1


@pytest.mark.asyncio
async def test_edited_approval_and_rejection(session, drafting):
    staff = await _admin(session, "staff")
    await process_inbound_message(session, message=_inbound("m-1", conversation="conversation-a"), actor=staff)
    await process_inbound_message(session, message=_inbound("m-2", conversation="conversation-b"), actor=staff)
    first, second = await _drafts(session)

    approval = await approve_support_draft(first.id, SupportDraftApproveInput(edited_body="  Our team will confirm pickup details shortly.  "), session, staff)
    assert approval.draft.status == "EDITED_APPROVED"
    assert approval.text == "Our team will confirm pickup details shortly."
    assert approval.draft.edited_body == approval.text
    assert approval.draft.body == REPLY

    rejected = await reject_support_draft(second.id, session, staff)
    assert rejected.status == "REJECTED"
    with pytest.raises(HTTPException) as error:
        await approve_support_draft(second.id, SupportDraftApproveInput(), session, staff)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_human_handled_conversation_drafts_belong_to_assignee_or_owner(session, drafting):
    assignee = await _admin(session, "assignee")
    other = await _admin(session, "other")
    owner = await _admin(session, "owner", "OWNER")
    ticket = SupportRequest(customer_name="Fictional Customer", contact="60123456789", source="WHATSAPP_FUTURE", subject="Pickup", priority="NORMAL", status="IN_PROGRESS", handoff_state="AI_ACTIVE")
    session.add(ticket)
    await session.flush()
    session.add(MessagingConversation(provider="SIMULATOR", external_conversation_id="conversation-1", contact_reference="60123456789", support_request_id=ticket.id))
    await session.commit()
    await process_inbound_message(session, message=_inbound("m-1"), actor=owner)
    draft = (await _drafts(session))[0]
    assert draft.support_request_id == ticket.id
    ticket.handoff_state, ticket.assigned_admin_id = "HUMAN_HANDLING", assignee.id
    await session.commit()

    with pytest.raises(HTTPException) as error:
        await reject_support_draft(draft.id, session, other)
    assert error.value.status_code == 403
    approval = await approve_support_draft(draft.id, SupportDraftApproveInput(), session, owner)
    assert approval.draft.status == "APPROVED"


@pytest.mark.asyncio
async def test_purge_clears_expired_draft_text_but_keeps_the_audit_row(session, drafting):
    owner = await _admin(session, "owner", "OWNER")
    await process_inbound_message(session, message=_inbound("m-1"), actor=owner)
    draft = (await _drafts(session))[0]
    draft.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    await session.commit()

    await purge_expired_message_content(session)
    await session.refresh(draft)

    assert draft.body is None and draft.customer_message is None and draft.edited_body is None
    assert draft.status == "PENDING_REVIEW"
    with pytest.raises(HTTPException) as error:
        await approve_support_draft(draft.id, SupportDraftApproveInput(), session, owner)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_outbound_sending_stays_disabled():
    with pytest.raises(RuntimeError):
        await messaging.MetaWhatsAppAdapter().send_template(recipient="60123456789", template_name="any", variables={})
    with pytest.raises(RuntimeError):
        await messaging.SimulatorAdapter().send_template(recipient="60123456789", template_name="any", variables={})


@pytest.mark.asyncio
async def test_grounded_draft_reports_settled_embedding_and_completion_cost(session, monkeypatch):
    from types import SimpleNamespace

    from app.services import support_copilot
    from app.services.support_copilot import RetrievedChunk

    monkeypatch.setattr(support_copilot.settings, "WHATSAPP_RAG_ENABLED", True)

    async def fake_embed(_db, _value):
        support_copilot._add_draft_cost(SimpleNamespace(estimated_cost_usd=0.0002))
        return [1.0]

    async def fake_retrieve(_db, _embedding, _language):
        return [RetrievedChunk(SupportDraftSource(type="FAQ", id=1, label="Pickup", similarity=0.9), REPLY, 0.9)]

    async def fake_draft(_db, _message, _language, _chunks):
        support_copilot._add_draft_cost(SimpleNamespace(estimated_cost_usd=0.001))
        return REPLY

    monkeypatch.setattr(support_copilot, "_embed", fake_embed)
    monkeypatch.setattr(support_copilot, "_retrieve", fake_retrieve)
    monkeypatch.setattr(support_copilot, "_draft", fake_draft)

    draft = await support_copilot.create_grounded_draft(session, message="Pickup options?", requested_language="EN")

    assert draft.reply == REPLY
    assert draft.estimated_cost_usd == pytest.approx(0.0012)
    assert support_copilot._draft_cost_usd.get() is None
