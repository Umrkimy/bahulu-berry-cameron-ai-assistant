from datetime import UTC, datetime, timedelta

import pytest
from fastapi import HTTPException

from app.api.routes.activity import list_activity
from app.auth.dependencies import get_current_superuser
from app.models.activity_log import ActivityLog
from app.models.admin import Admin


async def test_activity_is_owner_only_and_returns_filtered_pages_with_actor_names(session):
    owner = Admin(username="umar", email="umar@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    staff = Admin(username="haiqal", email="haiqal@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    session.add_all([owner, staff])
    await session.flush()
    now = datetime.now(UTC)
    session.add_all([
        ActivityLog(admin_id=owner.id, action="created", entity_type="enquiry", entity_id=8, description="Recorded enquiry: Delivery question.", created_at=now),
        ActivityLog(admin_id=staff.id, action="stock_moved", entity_type="inventory", entity_id=4, description="Recorded supplier receipt for Bahulu.", created_at=now - timedelta(minutes=1)),
        ActivityLog(admin_id=None, action="paid", entity_type="payment", entity_id=5, description="Payment confirmed.", created_at=now - timedelta(days=2)),
    ])
    await session.commit()

    page = await list_activity(session, owner, entity_type=None, entity_id=None, action=None, admin_id=None, start_at=None, end_at=None, limit=1, offset=0)
    assert page.total == 3
    assert len(page.items) == 1
    assert page.items[0].admin_username == "umar"

    filtered = await list_activity(session, owner, entity_type="inventory", entity_id=None, action="stock_moved", admin_id=staff.id, start_at=now - timedelta(hours=1), end_at=now + timedelta(hours=1), limit=50, offset=0)
    assert filtered.total == 1
    assert filtered.items[0].admin_username == "haiqal"
    with pytest.raises(HTTPException, match="Permission denied"):
        await get_current_superuser(staff)
