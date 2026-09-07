import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.support import claim_conversation, create_request, create_request_note, dashboard_reply, requests, return_conversation_to_ai, update_request
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.messaging import MessagingConversation
from app.models.support import SupportRequest
from app.schemas.messaging import DashboardReplyInput
from app.schemas.support import SupportRequestInput, SupportRequestNoteCreate


async def _admin(session, *, username: str, active: bool = True) -> Admin:
    admin = Admin(username=username, email=f"{username}@example.test", password_hash="test", role="STAFF", is_active=active)
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin


@pytest.mark.asyncio
async def test_support_ticket_notes_filters_and_safe_activity(session):
    staff = await _admin(session, username="staff")
    inactive = await _admin(session, username="inactive", active=False)
    request = await create_request(
        SupportRequestInput(
            customer_name="Aina",
            contact="0123456789",
            source="SOCIAL_MEDIA",
            subject="Pickup question",
            priority="HIGH",
            status="NEW",
        ),
        session,
        staff,
    )

    note = await create_request_note(request.id, SupportRequestNoteCreate(content="Customer asked for an update."), session, staff)
    assert note.support_request_id == request.id
    assert note.author_admin_id == staff.id

    updated = await update_request(
        request.id,
        SupportRequestInput(
            customer_name="Aina",
            contact="0123456789",
            source="SOCIAL_MEDIA",
            subject="Pickup question",
            priority="HIGH",
            status="IN_PROGRESS",
            assigned_admin_id=staff.id,
        ),
        session,
        staff,
    )
    assert updated.status == "IN_PROGRESS"

    page = await requests(session, staff, status_filter="IN_PROGRESS", priority="HIGH", source="SOCIAL_MEDIA", page=1, page_size=20)
    assert page.total == 1
    assert page.items[0].id == request.id

    activities = (await session.execute(select(ActivityLog).where(ActivityLog.entity_type == "support_request", ActivityLog.entity_id == request.id))).scalars().all()
    assert {item.action for item in activities} >= {"created", "noted", "assigned"}
    assert all("Customer asked" not in item.description for item in activities)

    with pytest.raises(HTTPException, match="not active"):
        await update_request(
            request.id,
            SupportRequestInput(
                customer_name="Aina",
                source="SOCIAL_MEDIA",
                subject="Pickup question",
                assigned_admin_id=inactive.id,
            ),
            session,
            staff,
        )


@pytest.mark.asyncio
async def test_human_takeover_requires_claim_and_releases_assignment(session):
    owner = await _admin(session, username="owner")
    owner.role = "OWNER"
    staff = await _admin(session, username="handler")
    coworker = await _admin(session, username="coworker")
    ticket = SupportRequest(customer_name="WhatsApp customer", contact="60123456789", source="WHATSAPP_FUTURE", subject="Human help", handoff_reason="Human requested", priority="HIGH", status="NEW", handoff_state="HUMAN_REQUESTED")
    session.add(ticket)
    await session.flush()
    session.add(MessagingConversation(provider="SIMULATOR", external_conversation_id="handoff-test", contact_reference="60123456789", support_request_id=ticket.id))
    await session.commit()

    with pytest.raises(HTTPException, match="Claim this conversation"):
        await update_request(ticket.id, SupportRequestInput(customer_name="WhatsApp customer", source="WHATSAPP_FUTURE", subject="Changed"), session, coworker)

    claimed = await claim_conversation(ticket.id, session, staff)
    assert claimed.handoff_state == "HUMAN_HANDLING"
    assert claimed.assigned_admin_id == staff.id

    with pytest.raises(HTTPException, match="assigned staff member"):
        await dashboard_reply(ticket.id, DashboardReplyInput(content="I can help."), session, coworker)

    reply = await dashboard_reply(ticket.id, DashboardReplyInput(content="I can help."), session, staff)
    assert reply.direction == "OUTBOUND"
    assert reply.content == "I can help."

    returned = await return_conversation_to_ai(ticket.id, session, owner)
    assert returned.handoff_state == "AI_ACTIVE"
    assert returned.assigned_admin_id is None
