from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.admin import Admin
from app.models.notification import Notification
from app.services.notification_services import add_notification, notify_owners, purge_expired_notifications


@pytest.mark.asyncio
async def test_notifications_are_recipient_specific_and_owner_targeted(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", is_superuser=True, role="OWNER", is_active=True)
    inactive_owner = Admin(username="inactive", email="inactive@example.test", password_hash="x", is_superuser=True, role="OWNER", is_active=False)
    staff = Admin(username="staff", email="staff@example.test", password_hash="x", is_superuser=False, role="STAFF", is_active=True)
    session.add_all([owner, inactive_owner, staff])
    await session.flush()

    add_notification(session, recipient_id=staff.id, notification_type="TASK", title="Task assigned", description="A task is ready.", entity_type="task", entity_id=10)
    await notify_owners(session, notification_type="REFUND", title="Refund requested", description="A refund needs review.", entity_type="refund_request", entity_id=4)
    await session.commit()

    rows = (await session.execute(select(Notification).order_by(Notification.id))).scalars().all()
    assert [(row.admin_id, row.notification_type, row.route) for row in rows] == [
        (staff.id, "TASK", "/tasks"),
        (owner.id, "REFUND", "/refund-requests"),
    ]


@pytest.mark.asyncio
async def test_notification_retention_removes_only_expired_records(session):
    admin = Admin(username="owner", email="owner@example.test", password_hash="x", is_superuser=True, role="OWNER", is_active=True)
    session.add(admin)
    await session.flush()
    old = add_notification(session, recipient_id=admin.id, notification_type="PAYMENT", title="Old", description="Old payment.")
    current = add_notification(session, recipient_id=admin.id, notification_type="PAYMENT", title="Current", description="Current payment.")
    old.created_at = datetime.now(UTC) - timedelta(days=91)
    await session.commit()

    assert await purge_expired_notifications(session) == 1
    rows = (await session.execute(select(Notification))).scalars().all()
    assert [row.id for row in rows] == [current.id]
