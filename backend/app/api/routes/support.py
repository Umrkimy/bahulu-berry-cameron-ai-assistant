from datetime import UTC, datetime
from typing import Annotated, Type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.support import HandoffRule, SupportFAQ, SupportRequest, SupportRequestNote, SupportTemplate
from app.schemas.messaging import SimulatorInboundInput, SimulatorInboundPublic
from app.schemas.pagination import PaginatedResponse
from app.schemas.support import FAQInput, FAQPublic, RuleInput, RulePublic, SupportAssigneePublic, SupportDraftInput, SupportDraftPublic, SupportRequestInput, SupportRequestNoteCreate, SupportRequestNotePublic, SupportRequestPublic, TemplateInput, TemplatePublic
from app.services.activity_services import record_activity
from app.services.support_copilot import create_grounded_draft
from app.services.messaging import SimulatorAdapter, process_inbound_message

router = APIRouter()
VALID_STATUS = {"NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"}
VALID_PRIORITY = {"LOW", "NORMAL", "HIGH", "URGENT"}
VALID_SOURCES = {"MANUAL", "PHONE", "SOCIAL_MEDIA", "WALK_IN", "WHATSAPP_FUTURE"}


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)

async def list_records(db: AsyncSession, model: Type): return (await db.execute(select(model).order_by(model.updated_at.desc()))).scalars().all()
async def owner_save(db: AsyncSession, admin: Admin, model: Type, data, item_id: int | None, entity: str):
    item = await db.get(model, item_id) if item_id else model(**data.model_dump())
    if item is None: raise HTTPException(404, detail="Support record not found.")
    if item_id:
        for key, value in data.model_dump().items(): setattr(item, key, value)
    else: db.add(item); await db.flush()
    await record_activity(db, admin=admin, action="updated" if item_id else "created", entity_type=entity, entity_id=item.id, description=f"{'Updated' if item_id else 'Created'} support {entity.replace('_', ' ')}.")
    await db.commit(); await db.refresh(item); return item

async def _approved_or_owner_records(db: AsyncSession, admin: Admin, model: Type):
    statement = select(model).order_by(model.updated_at.desc())
    if admin.role != "OWNER":
        statement = statement.where(model.is_active.is_(True))
    return (await db.execute(statement)).scalars().all()


@router.get("/faqs", response_model=list[FAQPublic])
async def faqs(db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]): return await _approved_or_owner_records(db, admin, SupportFAQ)
@router.post("/faqs", response_model=FAQPublic)
async def create_faq(data: FAQInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]): return await owner_save(db, admin, SupportFAQ, data, None, "support_faq")
@router.patch("/faqs/{item_id}", response_model=FAQPublic)
async def update_faq(item_id:int, data: FAQInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]): return await owner_save(db, admin, SupportFAQ, data, item_id, "support_faq")
@router.delete("/faqs/{item_id}", status_code=204)
async def delete_faq(item_id:int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item=await db.get(SupportFAQ,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_faq",entity_id=item.id,description="Deleted support FAQ."); await db.delete(item); await db.commit()

@router.get("/templates", response_model=list[TemplatePublic])
async def templates(db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]): return await _approved_or_owner_records(db, admin, SupportTemplate)
@router.post("/templates", response_model=TemplatePublic)
async def create_template(data:TemplateInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,SupportTemplate,data,None,"support_template")
@router.patch("/templates/{item_id}",response_model=TemplatePublic)
async def update_template(item_id:int,data:TemplateInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,SupportTemplate,data,item_id,"support_template")
@router.delete("/templates/{item_id}",status_code=204)
async def delete_template(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(SupportTemplate,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_template",entity_id=item.id,description="Deleted support template.");await db.delete(item);await db.commit()

@router.get("/rules",response_model=list[RulePublic])
async def rules(db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_admin)]): return await _approved_or_owner_records(db, admin, HandoffRule)
@router.post("/rules",response_model=RulePublic)
async def create_rule(data:RuleInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,HandoffRule,data,None,"handoff_rule")
@router.patch("/rules/{item_id}",response_model=RulePublic)
async def update_rule(item_id:int,data:RuleInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,HandoffRule,data,item_id,"handoff_rule")
@router.delete("/rules/{item_id}",status_code=204)
async def delete_rule(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(HandoffRule,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="handoff_rule",entity_id=item.id,description="Deleted handoff rule.");await db.delete(item);await db.commit()


@router.post("/copilot/draft", response_model=SupportDraftPublic)
async def create_support_draft(
    data: SupportDraftInput,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
):
    if data.support_request_id is not None and await db.get(SupportRequest, data.support_request_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    draft = await create_grounded_draft(
        db,
        message=data.message,
        requested_language=data.language,
    )
    await record_activity(
        db,
        admin=admin,
        action="drafted",
        entity_type="support_request" if data.support_request_id is not None else "support_copilot",
        entity_id=data.support_request_id,
        description="Generated a grounded support reply draft." if not draft.handoff_required else "Support copilot required a human handoff.",
        metadata={
            "model": draft.model,
            "prompt_version": draft.prompt_version,
            "latency_ms": draft.latency_ms,
            "estimated_cost_rm": 0,
            "source_ids": [source.id for source in draft.sources],
            "handoff_required": draft.handoff_required,
            "handoff_reason": draft.handoff_reason,
        },
    )
    await db.commit()
    return draft


@router.post("/simulator/inbound", response_model=SimulatorInboundPublic)
async def simulate_inbound_message(
    data: SimulatorInboundInput,
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_superuser)],
):
    adapter = SimulatorAdapter()
    if not adapter.verify_inbound(data):
        raise HTTPException(400, detail="Invalid simulator message.")
    return await process_inbound_message(db, message=adapter.normalize_inbound(data), actor=admin)


@router.get("/assignees", response_model=list[SupportAssigneePublic])
async def support_assignees(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_admin)],
):
    return (await db.execute(select(Admin).where(Admin.is_active.is_(True)).order_by(Admin.username))).scalars().all()

@router.get("/requests", response_model=PaginatedResponse[SupportRequestPublic])
async def requests(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_admin)],
    search: str | None = None,
    status_filter: str | None = None,
    priority: str | None = None,
    assigned_admin_id: int | None = None,
    source: str | None = None,
    has_handoff: bool | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    page: int = 1,
    page_size: int = 20,
):
    if status_filter is not None and status_filter not in VALID_STATUS:
        raise HTTPException(422, detail="Invalid support status.")
    if priority is not None and priority not in VALID_PRIORITY:
        raise HTTPException(422, detail="Invalid support priority.")
    if source is not None and source not in VALID_SOURCES:
        raise HTTPException(422, detail="Invalid support source.")
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(422, detail="Invalid pagination settings.")

    filters = []
    if search:
        needle = f"%{search.strip().lower()}%"
        filters.append(func.lower(SupportRequest.customer_name).like(needle) | func.lower(SupportRequest.subject).like(needle) | func.lower(func.coalesce(SupportRequest.contact, "")).like(needle))
    if status_filter:
        filters.append(SupportRequest.status == status_filter)
    if priority:
        filters.append(SupportRequest.priority == priority)
    if assigned_admin_id is not None:
        filters.append(SupportRequest.assigned_admin_id == assigned_admin_id)
    if source:
        filters.append(SupportRequest.source == source)
    if has_handoff is True:
        filters.append(SupportRequest.handoff_reason.is_not(None))
    if has_handoff is False:
        filters.append(SupportRequest.handoff_reason.is_(None))
    if start_at:
        filters.append(SupportRequest.created_at >= _as_utc(start_at))
    if end_at:
        filters.append(SupportRequest.created_at < _as_utc(end_at))

    total = await db.scalar(select(func.count()).select_from(SupportRequest).where(*filters))
    result = await db.execute(select(SupportRequest).where(*filters).order_by(SupportRequest.updated_at.desc()).offset((page - 1) * page_size).limit(page_size))
    return PaginatedResponse.create(items=result.scalars().all(), page=page, page_size=page_size, total=total or 0)
@router.post("/requests",response_model=SupportRequestPublic)
async def create_request(data:SupportRequestInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_admin)]):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY or data.source not in VALID_SOURCES: raise HTTPException(422,detail="Invalid support status, priority, or source.")
    if data.customer_id is not None and await db.get(Customer, data.customer_id) is None: raise HTTPException(404,detail="Customer not found.")
    if data.assigned_admin_id is not None:
        assignee = await db.get(Admin, data.assigned_admin_id)
        if assignee is None or not assignee.is_active: raise HTTPException(422,detail="Assigned team member is not active.")
    item=SupportRequest(**data.model_dump());db.add(item);await db.flush();await record_activity(db,admin=admin,action="created",entity_type="support_request",entity_id=item.id,description=f"Created support request #{item.id}.");await db.commit();await db.refresh(item);return item
@router.patch("/requests/{item_id}",response_model=SupportRequestPublic)
async def update_request(item_id:int,data:SupportRequestInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_admin)]):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY or data.source not in VALID_SOURCES: raise HTTPException(422,detail="Invalid support status, priority, or source.")
    if data.customer_id is not None and await db.get(Customer, data.customer_id) is None: raise HTTPException(404,detail="Customer not found.")
    if data.assigned_admin_id is not None:
        assignee = await db.get(Admin, data.assigned_admin_id)
        if assignee is None or not assignee.is_active: raise HTTPException(422,detail="Assigned team member is not active.")
    item=await db.get(SupportRequest,item_id)
    if not item: raise HTTPException(404,detail="Support request not found.")
    changes = {key: value for key, value in data.model_dump().items() if getattr(item, key) != value}
    for key, value in changes.items(): setattr(item, key, value)
    if changes:
        if "assigned_admin_id" in changes:
            description = f"Assigned support request #{item.id}."
            action = "assigned"
        elif "status" in changes:
            description = f"Updated support request #{item.id} status to {item.status.lower().replace('_', ' ')}."
            action = "status_changed"
        elif "priority" in changes:
            description = f"Updated support request #{item.id} priority."
            action = "priority_changed"
        else:
            description = f"Updated support request #{item.id}."
            action = "updated"
        await record_activity(db, admin=admin, action=action, entity_type="support_request", entity_id=item.id, description=description, metadata={"fields": sorted(changes.keys())})
        await db.commit()
        await db.refresh(item)
    return item


@router.get("/requests/{item_id}/notes", response_model=list[SupportRequestNotePublic])
async def request_notes(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]):
    if await db.get(SupportRequest, item_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    result = await db.execute(select(SupportRequestNote).where(SupportRequestNote.support_request_id == item_id).order_by(SupportRequestNote.created_at.asc()))
    return result.scalars().all()


@router.post("/requests/{item_id}/notes", response_model=SupportRequestNotePublic)
async def create_request_note(item_id: int, data: SupportRequestNoteCreate, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    if await db.get(SupportRequest, item_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    note = SupportRequestNote(support_request_id=item_id, author_admin_id=admin.id, content=data.content.strip())
    db.add(note)
    await db.flush()
    await record_activity(db, admin=admin, action="noted", entity_type="support_request", entity_id=item_id, description=f"Added an internal note to support request #{item_id}.")
    await db.commit()
    await db.refresh(note)
    return note
@router.delete("/requests/{item_id}",status_code=204)
async def delete_request(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(SupportRequest,item_id)
    if not item: raise HTTPException(404,detail="Support request not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_request",entity_id=item.id,description=f"Deleted support request #{item.id}.");await db.delete(item);await db.commit()
