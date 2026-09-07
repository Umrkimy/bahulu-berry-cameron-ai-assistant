from datetime import UTC, datetime
import re
from typing import Annotated, Type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.messaging import MessagingConversation, MessagingEvent
from app.models.support import HandoffRule, SupportFAQ, SupportRequest, SupportRequestNote, SupportTemplate
from app.schemas.messaging import DashboardReplyInput, SimulatorInboundInput, SimulatorInboundPublic, SupportMessagePublic, SupportMessagingConversationPublic, WhatsAppLinkPublic
from app.schemas.pagination import PaginatedResponse
from app.schemas.support import FAQInput, FAQPublic, RuleInput, RulePublic, SupportAssigneePublic, SupportDraftInput, SupportDraftPublic, SupportRequestInput, SupportRequestNoteCreate, SupportRequestNotePublic, SupportRequestPublic, TemplateInput, TemplatePublic
from app.services.activity_services import record_activity
from app.services.support_copilot import create_grounded_draft
from app.services.messaging import SimulatorAdapter, create_simulated_dashboard_reply, process_inbound_message, purge_expired_message_content

router = APIRouter()
VALID_STATUS = {"NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"}
VALID_PRIORITY = {"LOW", "NORMAL", "HIGH", "URGENT"}
VALID_SOURCES = {"MANUAL", "PHONE", "SOCIAL_MEDIA", "WALK_IN", "WHATSAPP_FUTURE"}
HUMAN_HANDOFF_STATES = {"HUMAN_REQUESTED", "HUMAN_HANDLING"}


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
    if data.support_request_id is not None:
        ticket = await db.get(SupportRequest, data.support_request_id)
        if ticket is None:
            raise HTTPException(404, detail="Support request not found.")
        if ticket.handoff_state in HUMAN_HANDOFF_STATES:
            raise HTTPException(409, detail="A human is handling this conversation. AI drafts are paused.")
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
    if item.handoff_state == "HUMAN_REQUESTED" and admin.role != "OWNER":
        raise HTTPException(403, detail="Claim this conversation before updating it.")
    if item.handoff_state == "HUMAN_REQUESTED" and data.assigned_admin_id != item.assigned_admin_id:
        raise HTTPException(409, detail="Use the claim action to assign a human-handoff conversation.")
    if item.handoff_state == "HUMAN_HANDLING" and admin.role != "OWNER" and item.assigned_admin_id != admin.id:
        raise HTTPException(403, detail="This human-handled conversation belongs to another staff member.")
    if item.handoff_state == "HUMAN_HANDLING" and admin.role != "OWNER" and data.assigned_admin_id != item.assigned_admin_id:
        raise HTTPException(403, detail="Only an Owner can reassign a human-handled conversation.")
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


@router.get("/requests/{item_id}/messaging-conversation", response_model=SupportMessagingConversationPublic | None)
async def request_messaging_conversation(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]):
    if await db.get(SupportRequest, item_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    conversation = await db.scalar(select(MessagingConversation).where(MessagingConversation.support_request_id == item_id).order_by(MessagingConversation.id.desc()))
    if conversation is None:
        return None
    return SupportMessagingConversationPublic(id=conversation.id, provider=conversation.provider, support_request_id=item_id)


async def _ticket_conversation(db: AsyncSession, item_id: int) -> tuple[SupportRequest, MessagingConversation]:
    ticket = await db.get(SupportRequest, item_id)
    if ticket is None:
        raise HTTPException(404, detail="Support request not found.")
    conversation = await db.scalar(select(MessagingConversation).where(MessagingConversation.support_request_id == item_id).order_by(MessagingConversation.id.desc()))
    if conversation is None:
        raise HTTPException(409, detail="This support request is not linked to a messaging conversation.")
    return ticket, conversation


def _can_manage_handoff(ticket: SupportRequest, admin: Admin) -> bool:
    return admin.role == "OWNER" or ticket.assigned_admin_id == admin.id


@router.get("/requests/{item_id}/messages", response_model=list[SupportMessagePublic])
async def request_messages(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]):
    _, conversation = await _ticket_conversation(db, item_id)
    await purge_expired_message_content(db)
    result = await db.execute(select(MessagingEvent).where(MessagingEvent.conversation_id == conversation.id).order_by(MessagingEvent.processed_at.asc()))
    return result.scalars().all()


@router.post("/requests/{item_id}/claim", response_model=SupportRequestPublic)
async def claim_conversation(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    ticket, _ = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_REQUESTED" or ticket.assigned_admin_id is not None:
        raise HTTPException(409, detail="This conversation is no longer available to claim.")
    ticket.assigned_admin_id = admin.id
    ticket.handoff_state = "HUMAN_HANDLING"
    ticket.status = "IN_PROGRESS"
    await record_activity(db, admin=admin, action="claimed", entity_type="support_request", entity_id=ticket.id, description=f"Claimed human handling for support request #{ticket.id}.")
    await db.commit(); await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/return-to-ai", response_model=SupportRequestPublic)
async def return_conversation_to_ai(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    ticket, _ = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_HANDLING":
        raise HTTPException(409, detail="This conversation is not being handled by a person.")
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can return this conversation to AI.")
    ticket.handoff_state = "AI_ACTIVE"
    ticket.assigned_admin_id = None
    await record_activity(db, admin=admin, action="returned_to_ai", entity_type="support_request", entity_id=ticket.id, description=f"Returned support request #{ticket.id} to AI handling.")
    await db.commit(); await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/request-human-takeover", response_model=SupportRequestPublic)
async def request_human_takeover(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    ticket, _ = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "AI_ACTIVE":
        raise HTTPException(409, detail="This conversation is already waiting for or being handled by a person.")
    ticket.handoff_state = "HUMAN_REQUESTED"
    ticket.assigned_admin_id = None
    ticket.status = "NEW"
    ticket.priority = "HIGH"
    ticket.handoff_reason = ticket.handoff_reason or "Human takeover requested by staff"
    await record_activity(db, admin=admin, action="human_takeover_requested", entity_type="support_request", entity_id=ticket.id, description=f"Requested human handling for support request #{ticket.id}.")
    await db.commit(); await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/dashboard-replies", response_model=SupportMessagePublic)
async def dashboard_reply(item_id: int, data: DashboardReplyInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    ticket, conversation = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_HANDLING":
        raise HTTPException(409, detail="Claim this conversation before sending a dashboard reply.")
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can send a dashboard reply.")
    return await create_simulated_dashboard_reply(db, conversation=conversation, support_request=ticket, admin=admin, content=data.content.strip())


@router.get("/requests/{item_id}/whatsapp-link", response_model=WhatsAppLinkPublic)
async def whatsapp_link(item_id: int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    ticket, conversation = await _ticket_conversation(db, item_id)
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can open this WhatsApp conversation.")
    number = re.sub(r"\D", "", conversation.contact_reference or ticket.contact or "")
    if len(number) < 8:
        raise HTTPException(409, detail="A valid WhatsApp contact is not available for this conversation.")
    return WhatsAppLinkPublic(url=f"https://wa.me/{number}")


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
