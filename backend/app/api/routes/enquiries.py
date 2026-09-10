from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.enquiry import Enquiry
from app.models.task import Task
from app.schemas.enquiry import EnquiryInput, EnquiryPublic, EnquiryStatusUpdate, EnquiryTaskInput
from app.schemas.task import TaskPublic
from app.services.activity_services import record_activity
from app.services.notification_services import add_notification


router = APIRouter()
_SOURCES = "^(WHATSAPP|CALL|WALK_IN|SOCIAL|OTHER)$"
_STATUSES = "^(NEW|WORKING|RESOLVED|SPAM)$"


def _clean_optional(value: str | None) -> str | None:
    value = value.strip() if value else None
    return value or None


def _public(item: Enquiry, task: Task | None = None) -> EnquiryPublic:
    return EnquiryPublic.model_validate(item).model_copy(
        update={"task": TaskPublic.model_validate(task) if task is not None else None}
    )


async def _get_enquiry(db: AsyncSession, enquiry_id: int, *, lock: bool = False) -> Enquiry:
    statement = select(Enquiry).where(Enquiry.id == enquiry_id)
    if lock:
        statement = statement.with_for_update()
    item = await db.scalar(statement)
    if item is None:
        raise HTTPException(404, "Enquiry not found.")
    return item


async def _active_assignee(db: AsyncSession, admin_id: int | None) -> None:
    if admin_id is None:
        return
    assignee = await db.get(Admin, admin_id)
    if assignee is None or not assignee.is_active:
        raise HTTPException(400, "Choose an active team member.")


@router.get("", response_model=list[EnquiryPublic])
async def list_enquiries(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
    status: str | None = Query(default=None, pattern=_STATUSES),
    source: str | None = Query(default=None, pattern=_SOURCES),
):
    statement = select(Enquiry).order_by(Enquiry.created_at.desc())
    if status:
        statement = statement.where(Enquiry.status == status)
    else:
        statement = statement.where(Enquiry.status != "SPAM")
    if source:
        statement = statement.where(Enquiry.source == source)
    items = (await db.execute(statement)).scalars().all()
    task_ids = [item.task_id for item in items if item.task_id is not None]
    tasks = (await db.execute(select(Task).where(Task.id.in_(task_ids)))).scalars().all() if task_ids else []
    tasks_by_id = {task.id: task for task in tasks}
    return [_public(item, tasks_by_id.get(item.task_id)) for item in items]


@router.get("/summary")
async def enquiry_summary(db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_superuser)]):
    rows = (await db.execute(select(Enquiry.status, func.count(Enquiry.id)).group_by(Enquiry.status))).all()
    counts = {status: 0 for status in ("NEW", "WORKING", "RESOLVED", "SPAM")}
    counts.update(dict(rows))
    return counts


@router.post("", response_model=EnquiryPublic, status_code=201)
async def create_enquiry(data: EnquiryInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item = Enquiry(
        title=data.title.strip(), notes=data.notes.strip(), source=data.source,
        contact_name=_clean_optional(data.contact_name), reply_contact=_clean_optional(data.reply_contact),
        created_by_admin_id=admin.id,
    )
    db.add(item)
    await db.flush()
    await record_activity(db, admin=admin, action="created", entity_type="enquiry", entity_id=item.id, description=f"Recorded enquiry: {item.title}.", metadata={"source": item.source})
    await db.commit()
    await db.refresh(item)
    return _public(item)


@router.patch("/{enquiry_id}", response_model=EnquiryPublic)
async def update_enquiry(enquiry_id: int, data: EnquiryInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item = await _get_enquiry(db, enquiry_id, lock=True)
    if item.status not in {"NEW", "WORKING"}:
        raise HTTPException(400, "Only new or working enquiries can be edited.")
    changes = {"title": data.title.strip(), "notes": data.notes.strip(), "source": data.source, "contact_name": _clean_optional(data.contact_name), "reply_contact": _clean_optional(data.reply_contact)}
    changed_fields = sorted(key for key, value in changes.items() if getattr(item, key) != value)
    if not changed_fields:
        return _public(item)
    for key in changed_fields:
        setattr(item, key, changes[key])
    await record_activity(db, admin=admin, action="updated", entity_type="enquiry", entity_id=item.id, description=f"Updated enquiry: {item.title}.", metadata={"fields": changed_fields})
    await db.commit()
    await db.refresh(item)
    return _public(item)


@router.patch("/{enquiry_id}/status", response_model=EnquiryPublic)
async def update_enquiry_status(enquiry_id: int, data: EnquiryStatusUpdate, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item = await _get_enquiry(db, enquiry_id, lock=True)
    allowed = {"NEW": {"WORKING", "RESOLVED", "SPAM"}, "WORKING": {"RESOLVED", "SPAM"}}
    if data.status not in allowed.get(item.status, set()):
        raise HTTPException(400, "This enquiry cannot move to that status.")
    item.status = data.status
    item.status_updated_by_admin_id = admin.id
    item.status_updated_at = datetime.now(UTC)
    action = "marked_spam" if data.status == "SPAM" else data.status.lower()
    await record_activity(db, admin=admin, action=action, entity_type="enquiry", entity_id=item.id, description=f"Marked enquiry as {data.status.lower()}.")
    await db.commit()
    await db.refresh(item)
    return _public(item)


@router.post("/{enquiry_id}/task", response_model=EnquiryPublic, status_code=201)
async def create_enquiry_task(enquiry_id: int, data: EnquiryTaskInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item = await _get_enquiry(db, enquiry_id, lock=True)
    if item.status != "WORKING":
        raise HTTPException(400, "Only working enquiries can become a task.")
    if item.task_id is not None:
        raise HTTPException(409, "This enquiry already has a linked task.")
    await _active_assignee(db, data.assigned_admin_id)
    task = Task(title=data.title.strip(), description=data.instructions.strip(), priority=data.priority, due_at=data.due_at, assigned_admin_id=data.assigned_admin_id, created_by_admin_id=admin.id)
    db.add(task)
    await db.flush()
    item.task_id = task.id
    if task.assigned_admin_id is not None and task.assigned_admin_id != admin.id:
        add_notification(db, recipient_id=task.assigned_admin_id, notification_type="TASK", title="New task assigned", description=f"You were assigned: {task.title}.", entity_type="task", entity_id=task.id)
    await record_activity(db, admin=admin, action="created", entity_type="task", entity_id=task.id, description=f"Created task from enquiry: {task.title}.", metadata={"enquiry_id": item.id})
    await record_activity(db, admin=admin, action="task_created", entity_type="enquiry", entity_id=item.id, description=f"Created task #{task.id} from working enquiry.", metadata={"task_id": task.id})
    await db.commit()
    await db.refresh(item)
    await db.refresh(task)
    return _public(item, task)
