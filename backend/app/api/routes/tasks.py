from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.task import Task
from app.schemas.task import TaskInput, TaskPublic, TaskUpdate
from app.services.activity_services import record_activity
from app.services.task_services import resolve_task_context

router = APIRouter()


async def _active_assignee(db: AsyncSession, admin_id: int | None) -> None:
    if admin_id is None:
        return
    assignee = await db.get(Admin, admin_id)
    if assignee is None or not assignee.is_active:
        raise HTTPException(400, "Choose an active team member.")


@router.get("", response_model=list[TaskPublic])
async def list_tasks(db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    query = select(Task).order_by(Task.status, Task.due_at.desc())
    if admin.role != "OWNER":
        query = query.where(Task.assigned_admin_id == admin.id)
    return (await db.execute(query)).scalars().all()


@router.post("", response_model=TaskPublic)
async def create_task(data: TaskInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    await _active_assignee(db, data.assigned_admin_id)
    try:
        context_type, context_id, context_label = await resolve_task_context(db, data.context_type, data.context_id)
    except ValueError as error:
        raise HTTPException(400, str(error)) from error
    item = Task(**data.model_dump(exclude={"context_type", "context_id"}), context_type=context_type, context_id=context_id, context_label=context_label, created_by_admin_id=admin.id)
    db.add(item)
    await db.flush()
    await record_activity(db, admin=admin, action="created", entity_type="task", entity_id=item.id, description=f"Created task {item.title}.", metadata={"context_type": context_type} if context_type else None)
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/{task_id}", response_model=TaskPublic)
async def update_task(task_id: int, data: TaskUpdate, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    item = await db.get(Task, task_id)
    if not item:
        raise HTTPException(404, "Task not found.")
    if admin.role != "OWNER" and item.assigned_admin_id != admin.id:
        raise HTTPException(403, "You can only update tasks assigned to you.")
    changes = data.model_dump(exclude_unset=True)
    if admin.role != "OWNER" and set(changes) - {"status", "completion_note"}:
        raise HTTPException(403, "Staff can only update their task status and completion note.")
    if any(changes.get(key) is None for key in ("status", "priority") if key in changes):
        raise HTTPException(400, "Status and priority cannot be empty.")
    if "completion_note" in changes:
        note = (changes["completion_note"] or "").strip()
        effective_status = changes.get("status", item.status)
        if not note:
            raise HTTPException(400, "Enter a completion note or leave it empty.")
        if effective_status != "COMPLETED":
            raise HTTPException(400, "A completion note can only be added when completing a task.")
        if item.completion_note is not None:
            raise HTTPException(400, "The completion note is already recorded and cannot be changed.")
        changes["completion_note"] = note
        changes["completed_at"] = datetime.now(UTC)
    if changes.get("assigned_admin_id") is not None:
        await _active_assignee(db, changes["assigned_admin_id"])
    if {"context_type", "context_id"} & set(changes):
        try:
            context_type, context_id, context_label = await resolve_task_context(db, changes.get("context_type", item.context_type), changes.get("context_id", item.context_id))
        except ValueError as error:
            raise HTTPException(400, str(error)) from error
        changes.update(context_type=context_type, context_id=context_id, context_label=context_label)
    changes = {key: value for key, value in changes.items() if getattr(item, key) != value}
    if not changes:
        return item
    for key, value in changes.items():
        setattr(item, key, value)
    await record_activity(db, admin=admin, action="updated", entity_type="task", entity_id=item.id, description=f"Updated task {item.title}.", metadata={"fields": sorted(changes)})
    await db.commit()
    await db.refresh(item)
    return item
