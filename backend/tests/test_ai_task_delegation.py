from datetime import datetime
from uuid import uuid4

import pytest
from sqlalchemy import func, select

from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.task import Task
from app.models.product import Product
from app.models.inventory import Inventory
from app.services import ai_assistant_services as ai
from app.services.ai_tools import create_task_tool, find_active_team_member, get_shift_summary


async def _admin(session, username: str, role: str) -> Admin:
    admin = Admin(
        username=username,
        email=f"{username}@example.test",
        password_hash="test",
        role=role,
        is_active=True,
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin


@pytest.mark.asyncio
async def test_owner_confirmation_creates_one_task_and_one_activity(session):
    owner = await _admin(session, "owner", "OWNER")
    assignee = await _admin(session, "Haiqal", "STAFF")
    conversation_id = str(uuid4())

    member = await find_active_team_member(session, "haiqal")
    assert member == {"success": True, "member": {"admin_id": assignee.id, "username": "Haiqal", "role": "STAFF"}}

    preview = await ai._execute_tool(
        db=session,
        tool_name="create_task",
        arguments={
            "assigned_admin_id": assignee.id,
            "title": "Prepare delivery orders",
            "description": "Pack paid delivery orders before handover.",
            "priority": "HIGH",
            "due_at": "2026-09-07T14:00:00+08:00",
        },
        conversation_history=[],
        current_message="Assign Haiqal to prepare delivery orders.",
        admin_id=owner.id,
        conversation_id=conversation_id,
        is_owner=True,
    )

    assert preview["confirmation_required"] is True
    assert "Haiqal" in preview["message"]
    assert "HIGH" not in preview["message"]
    assert "high" in preview["message"]
    assert "2026-09-07T14:00:00+08:00" in preview["message"]

    result = await ai.confirm_pending_confirmation(session, owner.id, conversation_id)
    assert result.response == "Created task for Haiqal: Prepare delivery orders."
    assert result.outcome == "COMPLETED"
    assert await session.scalar(select(func.count()).select_from(Task)) == 1
    assert await session.scalar(select(func.count()).select_from(ActivityLog).where(ActivityLog.entity_type == "task")) == 1
    task = await session.scalar(select(Task))
    assert task.assigned_admin_id == assignee.id
    assert task.due_at.replace(tzinfo=None) == datetime.fromisoformat("2026-09-07T14:00:00+08:00").replace(tzinfo=None)
    assert (await ai.confirm_pending_confirmation(session, owner.id, conversation_id)).outcome == "FAILED"


@pytest.mark.asyncio
async def test_task_tool_rejects_unknown_assignee_and_keeps_missing_deadline_empty(session):
    owner = await _admin(session, "owner", "OWNER")
    inactive = await _admin(session, "inactive", "STAFF")
    inactive.is_active = False
    await session.commit()

    missing = await find_active_team_member(session, "missing")
    assert missing["success"] is False
    result = await create_task_tool(
        session,
        assigned_admin_id=inactive.id,
        title="Valid task",
        created_by_admin_id=owner.id,
    )
    assert result["success"] is False
    assert await session.scalar(select(func.count()).select_from(Task)) == 0

    active = await _admin(session, "worker", "STAFF")
    result = await create_task_tool(
        session,
        assigned_admin_id=active.id,
        title="Valid task",
        created_by_admin_id=owner.id,
    )
    assert result["success"] is True
    assert result["due_at"] is None


@pytest.mark.asyncio
async def test_task_tool_rejects_ambiguous_members_and_non_malaysia_deadlines(session):
    owner = await _admin(session, "owner", "OWNER")
    first = await _admin(session, "haiqal-one", "STAFF")
    second = await _admin(session, "haiqal-two", "STAFF")
    ambiguous = await find_active_team_member(session, "haiqal")
    assert ambiguous["success"] is False
    assert {match["admin_id"] for match in ambiguous["matches"]} == {first.id, second.id}

    result = await create_task_tool(
        session,
        assigned_admin_id=first.id,
        title="Prepare delivery orders",
        due_at="2026-09-08T14:00:00+00:00",
        created_by_admin_id=owner.id,
    )
    assert result["success"] is False
    assert "Malaysia time" in result["error"]


@pytest.mark.asyncio
async def test_staff_cannot_preview_task_creation_with_ai(session):
    owner = await _admin(session, "owner", "OWNER")
    staff = await _admin(session, "staff", "STAFF")
    conversation_id = str(uuid4())
    result = await ai._execute_tool(
        db=session,
        tool_name="create_task",
        arguments={"assigned_admin_id": staff.id, "title": "Private task", "description": None, "priority": "NORMAL", "due_at": None},
        conversation_history=[],
        current_message="Assign a task",
        admin_id=staff.id,
        conversation_id=str(uuid4()),
        is_owner=False,
    )
    assert result == {"success": False, "error": "Only owners can ask the AI to make changes."}
    assert await session.scalar(select(func.count()).select_from(Task)) == 0


@pytest.mark.asyncio
async def test_shift_summary_scopes_tasks_to_staff_and_team_for_owner(session):
    owner = await _admin(session, "owner", "OWNER")
    staff = await _admin(session, "staff", "STAFF")
    other = await _admin(session, "other", "STAFF")
    session.add_all([
        Task(title="Staff task", assigned_admin_id=staff.id, created_by_admin_id=owner.id, status="OPEN"),
        Task(title="Other task", assigned_admin_id=other.id, created_by_admin_id=owner.id, status="IN_PROGRESS"),
        Task(title="Done task", assigned_admin_id=staff.id, created_by_admin_id=owner.id, status="COMPLETED"),
    ])
    await session.commit()

    staff_summary = await get_shift_summary(session, staff.id)
    owner_summary = await get_shift_summary(session, owner.id)

    assert staff_summary["tasks"] == {"scope": "your", "open": 1, "in_progress": 0}
    assert owner_summary["tasks"] == {"scope": "team", "open": 1, "in_progress": 1}
    assert "Staff task" not in str(staff_summary)
    assert "Other task" not in str(staff_summary)


@pytest.mark.asyncio
async def test_owner_confirmation_creates_contextual_inventory_task(session):
    owner = await _admin(session, "owner", "OWNER")
    assignee = await _admin(session, "worker", "STAFF")
    product = Product(name="Test Bahulu", price=10, is_active=True)
    session.add(product)
    await session.flush()
    inventory = Inventory(product_id=product.id, quantity=4, low_stock_threshold=10)
    session.add(inventory)
    await session.commit()
    conversation_id = str(uuid4())

    result = await ai._execute_tool(
        db=session,
        tool_name="create_task",
        arguments={"assigned_admin_id": assignee.id, "title": "Check low stock", "description": None, "priority": "HIGH", "due_at": None, "context_type": "INVENTORY", "context_id": inventory.id},
        conversation_history=[], current_message="Assign stock work", admin_id=owner.id,
        conversation_id=conversation_id, is_owner=True,
    )
    assert result["confirmation_required"] is True
    assert "Test Bahulu inventory" in result["message"]
    completed = await ai.confirm_pending_confirmation(session, owner.id, conversation_id)
    assert completed.response == "Created task for worker: Check low stock."
    task = await session.scalar(select(Task).where(Task.title == "Check low stock"))
    assert task.context_type == "INVENTORY"
    assert task.context_id == inventory.id
    assert task.context_label == "Test Bahulu inventory"
