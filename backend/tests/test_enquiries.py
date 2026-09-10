import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.enquiries import create_enquiry, create_enquiry_task, list_enquiries, update_enquiry, update_enquiry_status
from app.auth.dependencies import get_current_superuser
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.enquiry import Enquiry
from app.models.notification import Notification
from app.models.task import Task
from app.schemas.enquiry import EnquiryInput, EnquiryStatusUpdate, EnquiryTaskInput


async def make_enquiry(session, owner, **overrides):
    values = {"title": "Customer asked about delivery", "notes": "Reply with the approved delivery information.", "source": "WHATSAPP", "contact_name": "Aina", "reply_contact": "0123456789"}
    values.update(overrides)
    return await create_enquiry(EnquiryInput(**values), session, owner)


async def test_enquiries_are_owner_only_and_keep_only_minimal_contact_details(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    staff = Admin(username="staff", email="staff@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    session.add_all([owner, staff])
    await session.commit()

    created = await make_enquiry(session, owner)
    assert created.contact_name == "Aina"
    assert created.reply_contact == "0123456789"
    with pytest.raises(HTTPException, match="Permission denied"):
        await get_current_superuser(staff)


async def test_spam_is_excluded_by_default_and_can_be_filtered(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(owner)
    await session.commit()
    active = await make_enquiry(session, owner)
    spam = await make_enquiry(session, owner, title="Repeated advertising")
    await update_enquiry_status(spam.id, EnquiryStatusUpdate(status="SPAM"), session, owner)

    normal = await list_enquiries(session, owner, status=None, source=None)
    spam_items = await list_enquiries(session, owner, status="SPAM", source=None)
    assert [item.id for item in normal] == [active.id]
    assert [item.id for item in spam_items] == [spam.id]
    assert await session.scalar(select(ActivityLog).where(ActivityLog.entity_type == "enquiry", ActivityLog.action == "marked_spam")) is not None


async def test_only_new_or_working_enquiries_can_be_edited_and_status_transitions_are_safe(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(owner)
    await session.commit()
    created = await make_enquiry(session, owner)
    working = await update_enquiry_status(created.id, EnquiryStatusUpdate(status="WORKING"), session, owner)
    assert working.status == "WORKING"
    resolved = await update_enquiry_status(created.id, EnquiryStatusUpdate(status="RESOLVED"), session, owner)
    assert resolved.status == "RESOLVED"
    with pytest.raises(HTTPException, match="cannot move"):
        await update_enquiry_status(created.id, EnquiryStatusUpdate(status="SPAM"), session, owner)
    with pytest.raises(HTTPException, match="Only new or working"):
        await update_enquiry(created.id, EnquiryInput(title="Changed", notes="Changed note", source="CALL"), session, owner)


async def test_working_enquiry_creates_one_task_without_exposing_private_enquiry_data(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    staff = Admin(username="staff", email="staff@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    session.add_all([owner, staff])
    await session.commit()
    created = await make_enquiry(session, owner)
    await update_enquiry_status(created.id, EnquiryStatusUpdate(status="WORKING"), session, owner)

    converted = await create_enquiry_task(created.id, EnquiryTaskInput(title="Confirm delivery coverage", instructions="Check the approved coverage list and report back.", assigned_admin_id=staff.id), session, owner)
    assert converted.task_id is not None
    task = await session.get(Task, converted.task_id)
    assert task is not None and task.description == "Check the approved coverage list and report back."
    assert "0123456789" not in (task.description or "")
    assert await session.scalar(select(Notification).where(Notification.entity_type == "task", Notification.entity_id == converted.task_id, Notification.admin_id == staff.id)) is not None
    with pytest.raises(HTTPException, match="already has a linked task"):
        await create_enquiry_task(created.id, EnquiryTaskInput(title="Duplicate", instructions="Do not create this."), session, owner)


async def test_unworked_enquiry_and_inactive_assignee_cannot_create_tasks(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    inactive = Admin(username="inactive", email="inactive@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=False)
    session.add_all([owner, inactive])
    await session.commit()
    created = await make_enquiry(session, owner)
    with pytest.raises(HTTPException, match="Only working"):
        await create_enquiry_task(created.id, EnquiryTaskInput(title="Not ready", instructions="Wait."), session, owner)
    await update_enquiry_status(created.id, EnquiryStatusUpdate(status="WORKING"), session, owner)
    with pytest.raises(HTTPException, match="active team member"):
        await create_enquiry_task(created.id, EnquiryTaskInput(title="Bad assignee", instructions="Do not assign.", assigned_admin_id=inactive.id), session, owner)
    assert await session.scalar(select(Task.id)) is None
    assert await session.scalar(select(Enquiry).where(Enquiry.id == created.id)) is not None
