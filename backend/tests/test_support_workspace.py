import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.support import create_request, create_request_note, requests, update_request
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
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
