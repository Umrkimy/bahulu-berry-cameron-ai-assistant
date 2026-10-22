from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.core.config import settings
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.messaging import MessagingConversation, MessagingEvent
from app.models.support import HandoffRule, KnowledgeArticle, SupportFAQ, SupportRequest, SupportRequestNote, SupportTemplate
from app.models.support_draft import DRAFT_STATUSES, SupportDraft
from app.schemas.activity import ActivityPublic
from app.schemas.messaging import DashboardReplyInput, SupportConversationPublic, SupportMessagePublic, SupportMessagingConversationPublic, WhatsAppLinkPublic
from app.schemas.pagination import PaginatedResponse
from app.schemas.support import (
    FAQInput,
    FAQPublic,
    KnowledgeArticleInput,
    KnowledgeArticlePublic,
    RuleInput,
    RulePublic,
    SupportAssigneePublic,
    SupportDraftApprovalPublic,
    SupportDraftApproveInput,
    SupportDraftInput,
    SupportDraftPublic,
    SupportDraftReviewPublic,
    SupportRequestInput,
    SupportRequestNoteCreate,
    SupportRequestNotePublic,
    SupportRequestPublic,
    TemplateInput,
    TemplatePublic,
)
from app.services.activity_services import record_activity
from app.services.messaging import ask_for_rating, create_dashboard_reply, outbound_enabled, purge_expired_message_content, within_customer_window
from app.services.notification_services import add_notification, notify_owners
from app.services.support_copilot import create_grounded_draft, rebuild_knowledge_index, remove_knowledge_source, sync_knowledge_source
from app.services.support_drafts import review_public, save_draft, whatsapp_number, whatsapp_url

router = APIRouter()
VALID_STATUS = {"NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"}
VALID_PRIORITY = {"LOW", "NORMAL", "HIGH", "URGENT"}
VALID_SOURCES = {"MANUAL", "PHONE", "SOCIAL_MEDIA", "WALK_IN", "WHATSAPP_FUTURE"}
HUMAN_HANDOFF_STATES = {"HUMAN_REQUESTED", "HUMAN_HANDLING"}
OUTSIDE_WINDOW = "WhatsApp only allows replies within 24 hours of the customer's last message. Open WhatsApp to message them instead."


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


DB = Annotated[AsyncSession, Depends(get_db)]
CurrentAdmin = Annotated[Admin, Depends(get_current_admin)]
Owner = Annotated[Admin, Depends(get_current_superuser)]
KNOWLEDGE_SOURCE_TYPES = {SupportFAQ: "FAQ", SupportTemplate: "TEMPLATE", KnowledgeArticle: "ARTICLE"}


async def owner_save(db: AsyncSession, admin: Admin, model: type, data, item_id: int | None, entity: str):
    if item_id:
        item = await db.get(model, item_id)
        if item is None:
            raise HTTPException(404, detail="Support record not found.")
        for key, value in data.model_dump().items():
            setattr(item, key, value)
    else:
        item = model(**data.model_dump())
        db.add(item)
        await db.flush()
    source_type = KNOWLEDGE_SOURCE_TYPES.get(model)
    if source_type:
        await sync_knowledge_source(db, item, source_type)
    await record_activity(db, admin=admin, action="updated" if item_id else "created", entity_type=entity, entity_id=item.id, description=f"{'Updated' if item_id else 'Created'} support {entity.replace('_', ' ')}.")
    await db.commit()
    await db.refresh(item)
    return item


async def owner_delete(db: AsyncSession, admin: Admin, model: type, item_id: int, entity: str, description: str) -> None:
    item = await db.get(model, item_id)
    if item is None:
        raise HTTPException(404, detail="Support record not found.")
    source_type = KNOWLEDGE_SOURCE_TYPES.get(model)
    if source_type:
        await remove_knowledge_source(db, source_type, item.id)
    await record_activity(db, admin=admin, action="deleted", entity_type=entity, entity_id=item.id, description=description)
    await db.delete(item)
    await db.commit()


async def _approved_or_owner_records(db: AsyncSession, admin: Admin, model: type):
    statement = select(model).order_by(model.updated_at.desc())
    if admin.role != "OWNER":
        statement = statement.where(model.is_active.is_(True))
    return (await db.execute(statement)).scalars().all()


@router.get("/faqs", response_model=list[FAQPublic])
async def faqs(db: DB, admin: CurrentAdmin):
    return await _approved_or_owner_records(db, admin, SupportFAQ)


@router.post("/faqs", response_model=FAQPublic)
async def create_faq(data: FAQInput, db: DB, admin: Owner):
    return await owner_save(db, admin, SupportFAQ, data, None, "support_faq")


@router.patch("/faqs/{item_id}", response_model=FAQPublic)
async def update_faq(item_id: int, data: FAQInput, db: DB, admin: Owner):
    return await owner_save(db, admin, SupportFAQ, data, item_id, "support_faq")


@router.delete("/faqs/{item_id}", status_code=204)
async def delete_faq(item_id: int, db: DB, admin: Owner):
    await owner_delete(db, admin, SupportFAQ, item_id, "support_faq", "Deleted support FAQ.")


@router.get("/templates", response_model=list[TemplatePublic])
async def templates(db: DB, admin: CurrentAdmin):
    return await _approved_or_owner_records(db, admin, SupportTemplate)


@router.post("/templates", response_model=TemplatePublic)
async def create_template(data: TemplateInput, db: DB, admin: Owner):
    return await owner_save(db, admin, SupportTemplate, data, None, "support_template")


@router.patch("/templates/{item_id}", response_model=TemplatePublic)
async def update_template(item_id: int, data: TemplateInput, db: DB, admin: Owner):
    return await owner_save(db, admin, SupportTemplate, data, item_id, "support_template")


@router.delete("/templates/{item_id}", status_code=204)
async def delete_template(item_id: int, db: DB, admin: Owner):
    await owner_delete(db, admin, SupportTemplate, item_id, "support_template", "Deleted support template.")


@router.get("/knowledge-articles", response_model=list[KnowledgeArticlePublic])
async def knowledge_articles(db: DB, admin: CurrentAdmin):
    return await _approved_or_owner_records(db, admin, KnowledgeArticle)


@router.post("/knowledge-articles", response_model=KnowledgeArticlePublic)
async def create_knowledge_article(data: KnowledgeArticleInput, db: DB, admin: Owner):
    return await owner_save(db, admin, KnowledgeArticle, data, None, "knowledge_article")


@router.patch("/knowledge-articles/{item_id}", response_model=KnowledgeArticlePublic)
async def update_knowledge_article(item_id: int, data: KnowledgeArticleInput, db: DB, admin: Owner):
    return await owner_save(db, admin, KnowledgeArticle, data, item_id, "knowledge_article")


@router.delete("/knowledge-articles/{item_id}", status_code=204)
async def delete_knowledge_article(item_id: int, db: DB, admin: Owner):
    await owner_delete(db, admin, KnowledgeArticle, item_id, "knowledge_article", "Deleted knowledge article.")


@router.post("/knowledge/reindex")
async def reindex_knowledge(db: DB, admin: Owner):
    count = await rebuild_knowledge_index(db)
    await record_activity(db, admin=admin, action="reindexed", entity_type="support_knowledge", entity_id=None, description="Rebuilt semantic support knowledge embeddings.", metadata={"chunks": count})
    await db.commit()
    return {"chunks": count}


@router.get("/rules", response_model=list[RulePublic])
async def rules(db: DB, admin: CurrentAdmin):
    return await _approved_or_owner_records(db, admin, HandoffRule)


@router.post("/rules", response_model=RulePublic)
async def create_rule(data: RuleInput, db: DB, admin: Owner):
    return await owner_save(db, admin, HandoffRule, data, None, "handoff_rule")


@router.patch("/rules/{item_id}", response_model=RulePublic)
async def update_rule(item_id: int, data: RuleInput, db: DB, admin: Owner):
    return await owner_save(db, admin, HandoffRule, data, item_id, "handoff_rule")


@router.delete("/rules/{item_id}", status_code=204)
async def delete_rule(item_id: int, db: DB, admin: Owner):
    await owner_delete(db, admin, HandoffRule, item_id, "handoff_rule", "Deleted handoff rule.")


@router.post("/copilot/draft", response_model=SupportDraftPublic)
async def create_support_draft(
    data: SupportDraftInput,
    db: DB,
    admin: CurrentAdmin,
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
    conversation_id = None
    if data.support_request_id is not None:
        conversation_id = await db.scalar(select(MessagingConversation.id).where(MessagingConversation.support_request_id == data.support_request_id).order_by(MessagingConversation.id.desc()).limit(1))
    saved = await save_draft(db, draft=draft, customer_message=data.message, conversation_id=conversation_id, messaging_event_id=None, support_request_id=data.support_request_id)
    if saved is not None:
        draft = draft.model_copy(update={"draft_id": saved.id})
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
            "estimated_cost_usd": draft.estimated_cost_usd,
            "estimated_cost_rm": round(draft.estimated_cost_usd * settings.AI_DISPLAY_EXCHANGE_RATE, 6),
            "draft_id": draft.draft_id,
            "source_ids": [source.id for source in draft.sources],
            "handoff_required": draft.handoff_required,
            "handoff_reason": draft.handoff_reason,
        },
    )
    await db.commit()
    return draft


@router.get("/assignees", response_model=list[SupportAssigneePublic])
async def support_assignees(
    db: DB,
    _: CurrentAdmin,
):
    return (await db.execute(select(Admin).where(Admin.is_active.is_(True)).order_by(Admin.username))).scalars().all()


@router.get("/requests/{request_id}/activity", response_model=list[ActivityPublic])
async def request_activity(
    request_id: int,
    db: DB,
    _: CurrentAdmin,
):
    if await db.get(SupportRequest, request_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    rows = await db.execute(
        select(ActivityLog, Admin.username)
        .outerjoin(Admin, Admin.id == ActivityLog.admin_id)
        .where(ActivityLog.entity_type == "support_request", ActivityLog.entity_id == request_id)
        .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
    )
    return [ActivityPublic.model_validate(activity).model_copy(update={"admin_username": username}) for activity, username in rows.all()]


@router.get("/requests", response_model=PaginatedResponse[SupportRequestPublic])
async def requests(
    db: DB,
    _: CurrentAdmin,
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


@router.post("/requests", response_model=SupportRequestPublic)
async def create_request(data: SupportRequestInput, db: DB, admin: CurrentAdmin):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY or data.source not in VALID_SOURCES:
        raise HTTPException(422, detail="Invalid support status, priority, or source.")
    if data.customer_id is not None:
        customer = await db.get(Customer, data.customer_id)
        if customer is None or customer.is_archived:
            raise HTTPException(404, detail="Active customer not found.")
    if data.assigned_admin_id is not None:
        assignee = await db.get(Admin, data.assigned_admin_id)
        if assignee is None or not assignee.is_active:
            raise HTTPException(422, detail="Assigned team member is not active.")
    item = SupportRequest(**data.model_dump())
    db.add(item)
    await db.flush()
    if item.assigned_admin_id is not None and item.assigned_admin_id != admin.id:
        add_notification(
            db, recipient_id=item.assigned_admin_id, notification_type="SUPPORT", title="Support ticket assigned", description="A support ticket was assigned to you.", entity_type="support_request", entity_id=item.id
        )
    elif item.priority in {"HIGH", "URGENT"} or item.handoff_reason:
        await notify_owners(
            db, notification_type="SUPPORT", title="Support ticket needs attention", description="A high-priority or handoff support ticket is waiting for assignment.", entity_type="support_request", entity_id=item.id
        )
    await record_activity(db, admin=admin, action="created", entity_type="support_request", entity_id=item.id, description=f"Created support request #{item.id}.")
    await db.commit()
    await db.refresh(item)
    return item


@router.patch("/requests/{item_id}", response_model=SupportRequestPublic)
async def update_request(item_id: int, data: SupportRequestInput, db: DB, admin: CurrentAdmin):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY or data.source not in VALID_SOURCES:
        raise HTTPException(422, detail="Invalid support status, priority, or source.")
    if data.customer_id is not None:
        customer = await db.get(Customer, data.customer_id)
        if customer is None or customer.is_archived:
            raise HTTPException(404, detail="Active customer not found.")
    if data.assigned_admin_id is not None:
        assignee = await db.get(Admin, data.assigned_admin_id)
        if assignee is None or not assignee.is_active:
            raise HTTPException(422, detail="Assigned team member is not active.")
    item = await db.get(SupportRequest, item_id)
    if not item:
        raise HTTPException(404, detail="Support request not found.")
    if item.handoff_state == "HUMAN_REQUESTED" and admin.role != "OWNER":
        raise HTTPException(403, detail="Claim this conversation before updating it.")
    if item.handoff_state == "HUMAN_REQUESTED" and data.assigned_admin_id != item.assigned_admin_id:
        raise HTTPException(409, detail="Use the claim action to assign a human-handoff conversation.")
    if item.handoff_state == "HUMAN_HANDLING" and admin.role != "OWNER" and item.assigned_admin_id != admin.id:
        raise HTTPException(403, detail="This human-handled conversation belongs to another staff member.")
    if item.handoff_state == "HUMAN_HANDLING" and admin.role != "OWNER" and data.assigned_admin_id != item.assigned_admin_id:
        raise HTTPException(403, detail="Only an Owner can reassign a human-handled conversation.")
    changes = {key: value for key, value in data.model_dump().items() if getattr(item, key) != value}
    for key, value in changes.items():
        setattr(item, key, value)
    if changes:
        if "assigned_admin_id" in changes and item.assigned_admin_id is not None and item.assigned_admin_id != admin.id:
            add_notification(
                db, recipient_id=item.assigned_admin_id, notification_type="SUPPORT", title="Support ticket assigned", description="A support ticket was assigned to you.", entity_type="support_request", entity_id=item.id
            )
        if item.assigned_admin_id is None and ("priority" in changes or "handoff_reason" in changes) and (item.priority in {"HIGH", "URGENT"} or item.handoff_reason):
            await notify_owners(
                db,
                notification_type="SUPPORT",
                title="Support ticket needs attention",
                description="A high-priority or handoff support ticket is waiting for assignment.",
                entity_type="support_request",
                entity_id=item.id,
            )
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
async def request_notes(item_id: int, db: DB, _: CurrentAdmin):
    if await db.get(SupportRequest, item_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    result = await db.execute(select(SupportRequestNote).where(SupportRequestNote.support_request_id == item_id).order_by(SupportRequestNote.created_at.asc()))
    return result.scalars().all()


@router.get("/conversations", response_model=PaginatedResponse[SupportConversationPublic])
async def conversations(db: DB, _: CurrentAdmin, needs_attention: bool = False, page: int = 1, page_size: int = 30):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(422, detail="Invalid pagination settings.")
    await purge_expired_message_content(db)
    last_at = select(MessagingEvent.conversation_id, func.max(MessagingEvent.processed_at).label("last_at")).group_by(MessagingEvent.conversation_id).subquery()
    pending = select(SupportDraft.conversation_id, func.count().label("pending")).where(SupportDraft.status == "PENDING_REVIEW").group_by(SupportDraft.conversation_id).subquery()
    query = (
        select(MessagingConversation, SupportRequest, last_at.c.last_at, func.coalesce(pending.c.pending, 0))
        .join(last_at, last_at.c.conversation_id == MessagingConversation.id)
        .outerjoin(SupportRequest, SupportRequest.id == MessagingConversation.support_request_id)
        .outerjoin(pending, pending.c.conversation_id == MessagingConversation.id)
    )
    if needs_attention:
        query = query.where(or_(SupportRequest.handoff_state.in_(HUMAN_HANDOFF_STATES), pending.c.pending > 0))
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = (await db.execute(query.order_by(last_at.c.last_at.desc(), MessagingConversation.id.desc()).offset((page - 1) * page_size).limit(page_size))).all()
    items = []
    for conversation, ticket, last_message_at, pending_drafts in rows:
        last = await db.scalar(select(MessagingEvent).where(MessagingEvent.conversation_id == conversation.id).order_by(MessagingEvent.processed_at.desc(), MessagingEvent.id.desc()).limit(1))
        items.append(SupportConversationPublic(
            id=conversation.id,
            provider=conversation.provider,
            contact_reference=conversation.contact_reference,
            language=conversation.menu_language,
            support_request_id=ticket.id if ticket else None,
            handoff_state=ticket.handoff_state if ticket else "AI_ACTIVE",
            assigned_admin_id=ticket.assigned_admin_id if ticket else None,
            last_message=last.content[:160] if last and last.content else None,
            last_direction=last.direction if last else "INBOUND",
            last_at=last_message_at,
            pending_drafts=pending_drafts,
        ))
    return PaginatedResponse.create(items=items, page=page, page_size=page_size, total=total or 0)


@router.get("/conversations/{conversation_id}/messages", response_model=list[SupportMessagePublic])
async def conversation_messages(conversation_id: int, db: DB, _: CurrentAdmin):
    if await db.get(MessagingConversation, conversation_id) is None:
        raise HTTPException(404, detail="Conversation not found.")
    await purge_expired_message_content(db)
    result = await db.execute(select(MessagingEvent).where(MessagingEvent.conversation_id == conversation_id).order_by(MessagingEvent.processed_at.asc(), MessagingEvent.id.asc()))
    return result.scalars().all()


@router.get("/requests/{item_id}/messaging-conversation", response_model=SupportMessagingConversationPublic | None)
async def request_messaging_conversation(item_id: int, db: DB, _: CurrentAdmin):
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
async def request_messages(item_id: int, db: DB, _: CurrentAdmin):
    _, conversation = await _ticket_conversation(db, item_id)
    await purge_expired_message_content(db)
    result = await db.execute(select(MessagingEvent).where(MessagingEvent.conversation_id == conversation.id).order_by(MessagingEvent.processed_at.asc()))
    return result.scalars().all()


@router.post("/requests/{item_id}/claim", response_model=SupportRequestPublic)
async def claim_conversation(item_id: int, db: DB, admin: CurrentAdmin):
    await db.execute(select(SupportRequest).where(SupportRequest.id == item_id).with_for_update().execution_options(populate_existing=True))
    ticket, _ = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_REQUESTED" or ticket.assigned_admin_id is not None:
        raise HTTPException(409, detail="This conversation is no longer available to claim.")
    ticket.assigned_admin_id = admin.id
    ticket.handoff_state = "HUMAN_HANDLING"
    ticket.status = "IN_PROGRESS"
    await record_activity(db, admin=admin, action="claimed", entity_type="support_request", entity_id=ticket.id, description=f"Claimed human handling for support request #{ticket.id}.")
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/return-to-ai", response_model=SupportRequestPublic)
async def return_conversation_to_ai(item_id: int, db: DB, admin: CurrentAdmin):
    await db.execute(select(SupportRequest).where(SupportRequest.id == item_id).with_for_update().execution_options(populate_existing=True))
    ticket, conversation = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_HANDLING":
        raise HTTPException(409, detail="This conversation is not being handled by a person.")
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can return this conversation to AI.")
    handled_by = ticket.assigned_admin_id
    ticket.handoff_state = "AI_ACTIVE"
    ticket.assigned_admin_id = None
    await record_activity(db, admin=admin, action="returned_to_ai", entity_type="support_request", entity_id=ticket.id, description=f"Returned support request #{ticket.id} to AI handling.")
    await db.commit()
    if handled_by is not None:
        await ask_for_rating(db, conversation, admin_id=handled_by, support_request_id=ticket.id)
    await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/request-human-takeover", response_model=SupportRequestPublic)
async def request_human_takeover(item_id: int, db: DB, admin: CurrentAdmin):
    await db.execute(select(SupportRequest).where(SupportRequest.id == item_id).with_for_update().execution_options(populate_existing=True))
    ticket, _ = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "AI_ACTIVE":
        raise HTTPException(409, detail="This conversation is already waiting for or being handled by a person.")
    ticket.handoff_state = "HUMAN_REQUESTED"
    ticket.assigned_admin_id = None
    ticket.status = "NEW"
    ticket.priority = "HIGH"
    ticket.handoff_reason = ticket.handoff_reason or "Human takeover requested by staff"
    await notify_owners(
        db, notification_type="SUPPORT", title="Human takeover requested", description="A support conversation is waiting for a team member to claim it.", entity_type="support_request", entity_id=ticket.id
    )
    await record_activity(db, admin=admin, action="human_takeover_requested", entity_type="support_request", entity_id=ticket.id, description=f"Requested human handling for support request #{ticket.id}.")
    await db.commit()
    await db.refresh(ticket)
    return ticket


@router.post("/requests/{item_id}/dashboard-replies", response_model=SupportMessagePublic)
async def dashboard_reply(item_id: int, data: DashboardReplyInput, db: DB, admin: CurrentAdmin):
    ticket, conversation = await _ticket_conversation(db, item_id)
    if ticket.handoff_state != "HUMAN_HANDLING":
        raise HTTPException(409, detail="Claim this conversation before sending a dashboard reply.")
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can send a dashboard reply.")
    if outbound_enabled(conversation.provider) and not await within_customer_window(db, conversation):
        raise HTTPException(409, detail=OUTSIDE_WINDOW)
    return await create_dashboard_reply(db, conversation=conversation, support_request=ticket, admin=admin, content=data.content.strip())


@router.get("/requests/{item_id}/whatsapp-link", response_model=WhatsAppLinkPublic)
async def whatsapp_link(item_id: int, db: DB, admin: CurrentAdmin):
    ticket, conversation = await _ticket_conversation(db, item_id)
    if not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can open this WhatsApp conversation.")
    number = whatsapp_number(conversation.contact_reference, ticket.contact)
    if number is None:
        raise HTTPException(409, detail="A valid WhatsApp contact is not available for this conversation.")
    return WhatsAppLinkPublic(url=whatsapp_url(number))


async def _draft_contact(db: AsyncSession, draft: SupportDraft) -> tuple[SupportRequest | None, str | None]:
    ticket = await db.get(SupportRequest, draft.support_request_id) if draft.support_request_id else None
    conversation = await db.get(MessagingConversation, draft.conversation_id) if draft.conversation_id else None
    return ticket, whatsapp_number(conversation.contact_reference if conversation else None, ticket.contact if ticket else None)


@router.get("/drafts", response_model=PaginatedResponse[SupportDraftReviewPublic])
async def support_drafts(
    db: DB,
    _: CurrentAdmin,
    status_filter: str | None = "PENDING_REVIEW",
    support_request_id: int | None = None,
    page: int = 1,
    page_size: int = 20,
):
    # Comma-separated so the history view can ask for APPROVED,EDITED_APPROVED together.
    statuses = [status.strip() for status in status_filter.split(",") if status.strip()] if status_filter else []
    if any(status not in DRAFT_STATUSES for status in statuses):
        raise HTTPException(422, detail="Invalid draft status.")
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(422, detail="Invalid pagination settings.")
    await purge_expired_message_content(db)
    filters = []
    if statuses:
        filters.append(SupportDraft.status.in_(statuses))
    if support_request_id is not None:
        filters.append(SupportDraft.support_request_id == support_request_id)
    total = await db.scalar(select(func.count()).select_from(SupportDraft).where(*filters))
    drafts = (await db.execute(select(SupportDraft).where(*filters).order_by(SupportDraft.created_at.desc(), SupportDraft.id.desc()).offset((page - 1) * page_size).limit(page_size))).scalars().all()
    items = []
    for draft in drafts:
        _, number = await _draft_contact(db, draft)
        items.append(review_public(draft, whatsapp_available=number is not None))
    return PaginatedResponse.create(items=items, page=page, page_size=page_size, total=total or 0)


async def _pending_draft_for_review(db: AsyncSession, draft_id: int, admin: Admin) -> tuple[SupportDraft, SupportRequest | None, str | None]:
    draft = await db.scalar(select(SupportDraft).where(SupportDraft.id == draft_id).with_for_update().execution_options(populate_existing=True))
    if draft is None:
        raise HTTPException(404, detail="Draft not found.")
    if draft.status != "PENDING_REVIEW":
        raise HTTPException(409, detail="This draft has already been reviewed or replaced by a newer one.")
    ticket, number = await _draft_contact(db, draft)
    if ticket is not None and ticket.handoff_state == "HUMAN_HANDLING" and not _can_manage_handoff(ticket, admin):
        raise HTTPException(403, detail="Only the assigned staff member or an Owner can review drafts for this conversation.")
    return draft, ticket, number


async def _record_draft_review(db: AsyncSession, admin: Admin, draft: SupportDraft, action: str, description: str, edited: bool = False) -> None:
    linked = draft.support_request_id is not None
    await record_activity(
        db,
        admin=admin,
        action=action,
        entity_type="support_request" if linked else "support_draft",
        entity_id=draft.support_request_id if linked else draft.id,
        description=description,
        metadata={"draft_id": draft.id, "edited": edited},
    )


@router.post("/drafts/{draft_id}/approve", response_model=SupportDraftApprovalPublic)
async def approve_support_draft(draft_id: int, data: SupportDraftApproveInput, db: DB, admin: CurrentAdmin):
    draft, ticket, number = await _pending_draft_for_review(db, draft_id, admin)
    if draft.body is None:
        raise HTTPException(409, detail="This draft has expired.")
    conversation = await db.get(MessagingConversation, draft.conversation_id) if draft.conversation_id else None
    sending = conversation is not None and outbound_enabled(conversation.provider)
    if sending and not await within_customer_window(db, conversation):
        raise HTTPException(409, detail=OUTSIDE_WINDOW)
    edited = data.edited_body is not None and data.edited_body.strip() != draft.body.strip()
    text = data.edited_body.strip() if edited else draft.body
    draft.edited_body = text if edited else None
    draft.status = "EDITED_APPROVED" if edited else "APPROVED"
    draft.reviewed_by_admin_id = admin.id
    draft.reviewed_at = datetime.now(UTC)
    await _record_draft_review(db, admin, draft, "draft_approved", f"Approved an edited reply draft #{draft.id}." if edited else f"Approved reply draft #{draft.id}.", edited)
    await db.commit()
    await db.refresh(draft)
    sent = None
    if sending:
        event = await create_dashboard_reply(db, conversation=conversation, support_request=ticket, admin=admin, content=text)
        sent = event.outcome == "SENT"
        await db.refresh(draft)
    return SupportDraftApprovalPublic(draft=review_public(draft, whatsapp_available=number is not None), text=text, whatsapp_url=whatsapp_url(number, text) if number else None, sent=sent)


@router.post("/drafts/{draft_id}/reject", response_model=SupportDraftReviewPublic)
async def reject_support_draft(draft_id: int, db: DB, admin: CurrentAdmin):
    draft, _, number = await _pending_draft_for_review(db, draft_id, admin)
    draft.status = "REJECTED"
    draft.reviewed_by_admin_id = admin.id
    draft.reviewed_at = datetime.now(UTC)
    await _record_draft_review(db, admin, draft, "draft_rejected", f"Rejected reply draft #{draft.id}.")
    await db.commit()
    await db.refresh(draft)
    return review_public(draft, whatsapp_available=number is not None)


@router.post("/requests/{item_id}/notes", response_model=SupportRequestNotePublic)
async def create_request_note(item_id: int, data: SupportRequestNoteCreate, db: DB, admin: CurrentAdmin):
    if await db.get(SupportRequest, item_id) is None:
        raise HTTPException(404, detail="Support request not found.")
    note = SupportRequestNote(support_request_id=item_id, author_admin_id=admin.id, content=data.content.strip())
    db.add(note)
    await db.flush()
    await record_activity(db, admin=admin, action="noted", entity_type="support_request", entity_id=item_id, description=f"Added an internal note to support request #{item_id}.")
    await db.commit()
    await db.refresh(note)
    return note


@router.delete("/requests/{item_id}", status_code=204)
async def delete_request(item_id: int, db: DB, admin: Owner):
    item = await db.get(SupportRequest, item_id)
    if not item:
        raise HTTPException(404, detail="Support request not found.")
    await record_activity(db, admin=admin, action="deleted", entity_type="support_request", entity_id=item.id, description=f"Deleted support request #{item.id}.")
    await db.delete(item)
    await db.commit()
