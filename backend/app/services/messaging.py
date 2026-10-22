import hmac
import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any, Protocol
from uuid import uuid4

import httpx
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.admin import Admin
from app.models.messaging import MessagingConversation, MessagingEvent
from app.models.support import SupportRequest
from app.models.support_rating import SupportRating
from app.schemas.messaging import InboundMessageResult
from app.services.activity_services import record_activity
from app.services.support_copilot import create_grounded_draft
from app.services.support_drafts import purge_expired_drafts, save_draft
from app.services.transaction_lock import acquire_transaction_lock
from app.services.whatsapp_menu import RATING_STEP, handoff_message, menu_reply, rating_question

logger = logging.getLogger("bahulu.whatsapp")
CUSTOMER_WINDOW = timedelta(hours=24)


class OutboundSendError(RuntimeError):
    pass


@dataclass(frozen=True)
class DeliveryStatus:
    external_message_id: str
    status: str
    error: str | None


@dataclass(frozen=True)
class NormalizedInboundMessage:
    provider: str
    external_message_id: str
    external_conversation_id: str
    sender_reference: str
    message: str
    language: str


class MessagingAdapter(Protocol):
    def normalize_inbound(self, payload: object) -> NormalizedInboundMessage: ...
    def verify_inbound(self, payload: object) -> bool: ...
    async def send_template(self, *, recipient: str, template_name: str, variables: dict[str, str]) -> str: ...


class MetaWhatsAppAdapter:
    provider = "META_WHATSAPP"

    def __init__(self, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._transport = transport

    def normalize_inbound(self, payload: dict[str, Any]) -> list[NormalizedInboundMessage]:
        messages: list[NormalizedInboundMessage] = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                phone_number_id = value.get("metadata", {}).get("phone_number_id", "")
                if settings.WHATSAPP_META_PHONE_NUMBER_ID and phone_number_id != settings.WHATSAPP_META_PHONE_NUMBER_ID:
                    continue
                for item in value.get("messages", []):
                    text = item.get("text", {}).get("body") if item.get("type") == "text" else None
                    message_id, sender = item.get("id"), item.get("from")
                    if not isinstance(text, str) or not isinstance(message_id, str) or not isinstance(sender, str):
                        continue
                    text = text.strip()
                    if not 1 <= len(text) <= 2_000:
                        continue
                    messages.append(NormalizedInboundMessage(
                        provider=self.provider,
                        external_message_id=message_id,
                        external_conversation_id=f"{phone_number_id}:{sender}",
                        sender_reference=sender,
                        message=text,
                        language="AUTO",
                    ))
        return messages

    def delivery_statuses(self, payload: dict[str, Any]) -> list[DeliveryStatus]:
        statuses: list[DeliveryStatus] = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                if settings.WHATSAPP_META_PHONE_NUMBER_ID and value.get("metadata", {}).get("phone_number_id", "") != settings.WHATSAPP_META_PHONE_NUMBER_ID:
                    continue
                for item in value.get("statuses", []):
                    message_id, status = item.get("id"), item.get("status")
                    if not isinstance(message_id, str) or status not in DELIVERY_OUTCOMES:
                        continue
                    errors = item.get("errors") or [{}]
                    error = None
                    if status == "failed":
                        first = errors[0] if isinstance(errors[0], dict) else {}
                        error = f"{first.get('code', '')} {first.get('title', 'Not delivered')}".strip()[:160]
                    statuses.append(DeliveryStatus(external_message_id=message_id, status=status, error=error))
        return statuses

    def verify_inbound(self, payload: object) -> bool:
        return isinstance(payload, dict)

    async def send_template(self, *, recipient: str, template_name: str, variables: dict[str, str]) -> str:
        raise RuntimeError("Template messages are not enabled.")

    async def send_text(self, *, recipient: str, body: str) -> str:
        token = settings.WHATSAPP_META_ACCESS_TOKEN.get_secret_value()
        if not outbound_enabled(self.provider) or not token or not settings.WHATSAPP_META_PHONE_NUMBER_ID:
            raise OutboundSendError("WhatsApp sending is not enabled.")
        url = f"https://graph.facebook.com/{settings.WHATSAPP_META_GRAPH_VERSION}/{settings.WHATSAPP_META_PHONE_NUMBER_ID}/messages"
        payload = {"messaging_product": "whatsapp", "recipient_type": "individual", "to": recipient, "type": "text", "text": {"preview_url": False, "body": body}}
        try:
            async with httpx.AsyncClient(timeout=10, transport=self._transport, follow_redirects=False) as client:
                response = await client.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
            response.raise_for_status()
            message_id = response.json()["messages"][0]["id"]
        except httpx.HTTPStatusError as error:
            logger.warning("WhatsApp send was rejected with status %s.", error.response.status_code)
            raise OutboundSendError("WhatsApp did not accept the message.") from error
        except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError) as error:
            logger.warning("WhatsApp send failed: %s.", type(error).__name__)
            raise OutboundSendError("WhatsApp did not accept the message.") from error
        if not isinstance(message_id, str):
            raise OutboundSendError("WhatsApp did not accept the message.")
        return message_id


DELIVERY_OUTCOMES = {"sent": "SENT", "delivered": "DELIVERED", "read": "READ", "failed": "SEND_FAILED"}
DELIVERY_RANK = {"PENDING_SEND": 0, "SENT": 1, "DELIVERED": 2, "READ": 3}


async def apply_delivery_statuses(db: AsyncSession, statuses: list[DeliveryStatus]) -> int:
    updated = 0
    for item in statuses:
        event = await db.scalar(select(MessagingEvent).where(MessagingEvent.provider == MetaWhatsAppAdapter.provider, MessagingEvent.external_message_id == item.external_message_id, MessagingEvent.direction == "OUTBOUND"))
        if event is None:
            continue
        outcome = DELIVERY_OUTCOMES[item.status]
        if outcome == "SEND_FAILED":
            event.outcome, event.delivery_error = outcome, item.error
        elif DELIVERY_RANK.get(outcome, 0) > DELIVERY_RANK.get(event.outcome, 99):
            event.outcome = outcome
        else:
            continue
        updated += 1
    await db.commit()
    return updated


def outbound_enabled(provider: str) -> bool:
    return provider == MetaWhatsAppAdapter.provider and settings.WHATSAPP_META_OUTBOUND_ENABLED


async def within_customer_window(db: AsyncSession, conversation: MessagingConversation) -> bool:
    last = await db.scalar(select(func.max(MessagingEvent.processed_at)).where(MessagingEvent.conversation_id == conversation.id, MessagingEvent.direction == "INBOUND"))
    if last is None:
        return False
    last = last if last.tzinfo else last.replace(tzinfo=UTC)
    return datetime.now(UTC) - last < CUSTOMER_WINDOW


async def deliver_outbound(db: AsyncSession, event: MessagingEvent, conversation: MessagingConversation) -> None:
    if not outbound_enabled(conversation.provider) or not conversation.contact_reference or not event.content:
        return
    try:
        event.external_message_id = await MetaWhatsAppAdapter().send_text(recipient=conversation.contact_reference, body=event.content)
        event.outcome = "SENT"
    except OutboundSendError:
        event.outcome = "SEND_FAILED"
    await db.commit()


def _payload_hash(message: str) -> str:
    return hmac.new(settings.SECRET_KEY.get_secret_value().encode(), message.encode(), sha256).hexdigest()


def _message_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=30)


async def purge_expired_message_content(db: AsyncSession) -> None:
    await db.execute(
        update(MessagingEvent)
        .where(MessagingEvent.content.is_not(None), MessagingEvent.expires_at.is_not(None), MessagingEvent.expires_at <= datetime.now(UTC))
        .values(content=None)
    )
    await purge_expired_drafts(db)
    await db.commit()


async def ask_for_rating(db: AsyncSession, conversation: MessagingConversation, *, admin_id: int, support_request_id: int | None) -> bool:
    if not settings.WHATSAPP_MENU_ENABLED:
        return False
    if outbound_enabled(conversation.provider) and not await within_customer_window(db, conversation):
        return False
    db.add(SupportRating(conversation_id=conversation.id, support_request_id=support_request_id, admin_id=admin_id))
    conversation.menu_step = RATING_STEP
    question = rating_question(conversation.menu_language or "EN")
    event = MessagingEvent(
        provider=conversation.provider,
        external_message_id=f"local-outbound-{uuid4()}",
        conversation_id=conversation.id,
        support_request_id=support_request_id,
        direction="OUTBOUND",
        outcome="PENDING_SEND" if outbound_enabled(conversation.provider) else "AUTO_REPLY",
        payload_hash=_payload_hash(question),
        content=question,
        expires_at=_message_expiry(),
    )
    db.add(event)
    await db.commit()
    await deliver_outbound(db, event, conversation)
    return True


async def create_dashboard_reply(
    db: AsyncSession,
    *,
    conversation: MessagingConversation,
    support_request: SupportRequest | None,
    admin: Admin,
    content: str,
) -> MessagingEvent:
    sending = outbound_enabled(conversation.provider)
    event = MessagingEvent(
        provider=conversation.provider,
        external_message_id=f"local-outbound-{uuid4()}",
        conversation_id=conversation.id,
        support_request_id=support_request.id if support_request else None,
        direction="OUTBOUND",
        outcome="PENDING_SEND" if sending else "SIMULATED_SENT",
        payload_hash=_payload_hash(content),
        content=content,
        author_admin_id=admin.id,
        expires_at=_message_expiry(),
    )
    db.add(event)
    await db.flush()
    await record_activity(
        db,
        admin=admin,
        action="replied",
        entity_type="support_request" if support_request else "messaging_event",
        entity_id=support_request.id if support_request else event.id,
        description=f"Sent a dashboard reply for support request #{support_request.id}." if support_request else "Sent a dashboard reply.",
        metadata={"provider": conversation.provider, "mode": "META" if sending else "SIMULATED"},
    )
    await db.commit()
    await deliver_outbound(db, event, conversation)
    await db.refresh(event)
    return event


async def _request_handoff(db: AsyncSession, conversation: MessagingConversation, *, reason: str | None, actor: Admin | None) -> tuple[int | None, bool]:
    if conversation.support_request_id is None:
        ticket = SupportRequest(
            customer_name="WhatsApp customer",
            contact=conversation.contact_reference,
            source="WHATSAPP_FUTURE",
            subject="WhatsApp support handoff",
            notes=None,
            handoff_reason=reason,
            priority="HIGH",
            status="NEW",
            handoff_state="HUMAN_REQUESTED",
            assigned_admin_id=None,
        )
        db.add(ticket)
        await db.flush()
        conversation.support_request_id = ticket.id
        await record_activity(db, admin=actor, action="created", entity_type="support_request", entity_id=ticket.id, description=f"Created support request #{ticket.id} from an inbound support handoff.")
        return ticket.id, True
    ticket = await db.get(SupportRequest, conversation.support_request_id)
    if ticket is not None and ticket.handoff_state == "AI_ACTIVE":
        ticket.handoff_state = "HUMAN_REQUESTED"
        ticket.assigned_admin_id = None
        ticket.status = "NEW"
        ticket.priority = "HIGH"
        ticket.handoff_reason = reason
        await record_activity(db, admin=actor, action="reopened_for_handoff", entity_type="support_request", entity_id=ticket.id, description=f"Reopened support request #{ticket.id} for human handling.")
    return conversation.support_request_id, False


_OUTCOME_DESCRIPTIONS = {
    "HANDOFF": "Processed an inbound message into a human handoff.",
    "DRAFTED": "Processed an inbound message into a grounded draft.",
    "MENU": "Answered an inbound message from the WhatsApp menu.",
}


async def process_inbound_message(db: AsyncSession, *, message: NormalizedInboundMessage, actor: Admin | None = None) -> InboundMessageResult:
    await acquire_transaction_lock(db, "messaging-intake")
    existing = await db.scalar(select(MessagingEvent).where(MessagingEvent.provider == message.provider, MessagingEvent.external_message_id == message.external_message_id))
    if existing is not None:
        return InboundMessageResult(outcome="DUPLICATE", duplicate=True, support_request_id=existing.support_request_id)

    conversation = await db.scalar(select(MessagingConversation).where(MessagingConversation.provider == message.provider, MessagingConversation.external_conversation_id == message.external_conversation_id))
    first_contact = conversation is None
    if conversation is None:
        conversation = MessagingConversation(provider=message.provider, external_conversation_id=message.external_conversation_id, contact_reference=message.sender_reference)
        db.add(conversation)
        await db.flush()
    elif conversation.contact_reference is None:
        conversation.contact_reference = message.sender_reference

    ticket = await db.scalar(select(SupportRequest).where(SupportRequest.id == conversation.support_request_id).with_for_update().execution_options(populate_existing=True)) if conversation.support_request_id else None
    human_handling = ticket is not None and ticket.handoff_state in {"HUMAN_HANDLING", "HUMAN_REQUESTED"}
    menu_enabled = settings.WHATSAPP_MENU_ENABLED and not human_handling
    menu = await menu_reply(db, conversation, message=message.message, requested_language=message.language, first_contact=first_contact) if menu_enabled else None
    draft = None if human_handling or (menu is not None and not menu.draft_too) else await create_grounded_draft(db, message=message.message, requested_language=message.language)
    support_request_id: int | None = conversation.support_request_id
    ticket_created = False
    handoff_reason = menu.handoff_reason if menu is not None and menu.handoff_reason else (draft.handoff_reason if draft is not None and draft.handoff_required else None)
    if human_handling or handoff_reason:
        outcome = "HANDOFF"
    else:
        outcome = "DRAFTED" if draft is not None else "MENU"
    if handoff_reason:
        support_request_id, ticket_created = await _request_handoff(db, conversation, reason=handoff_reason, actor=actor)

    event = MessagingEvent(
        provider=message.provider,
        external_message_id=message.external_message_id,
        conversation_id=conversation.id,
        support_request_id=support_request_id,
        direction="INBOUND",
        outcome=outcome,
        payload_hash=_payload_hash(message.message),
        content=message.message,
        expires_at=_message_expiry(),
    )
    db.add(event)
    await db.flush()
    if outcome == "DRAFTED" and draft is not None:
        saved = await save_draft(db, draft=draft, customer_message=message.message, conversation_id=conversation.id, messaging_event_id=event.id, support_request_id=support_request_id)
        if saved is not None:
            draft = draft.model_copy(update={"draft_id": saved.id})
    reply = None
    if menu_enabled:
        reply = handoff_message(conversation.menu_language or "EN") if outcome == "HANDOFF" else (menu.text if menu is not None else None)
    outbound = None
    if reply is not None:
        outbound = MessagingEvent(
            provider=message.provider,
            external_message_id=f"local-outbound-{uuid4()}",
            conversation_id=conversation.id,
            support_request_id=support_request_id,
            direction="OUTBOUND",
            outcome="PENDING_SEND" if outbound_enabled(message.provider) else "AUTO_REPLY",
            payload_hash=_payload_hash(reply),
            content=reply,
            expires_at=_message_expiry(),
        )
        db.add(outbound)
    await record_activity(
        db,
        admin=actor,
        action="processed",
        entity_type="messaging_event",
        entity_id=event.id,
        description=_OUTCOME_DESCRIPTIONS[outcome],
        metadata={"provider": message.provider, "outcome": outcome, "support_request_id": support_request_id},
    )
    await db.commit()
    if outbound is not None:
        await deliver_outbound(db, outbound, conversation)
    return InboundMessageResult(outcome=outcome, duplicate=False, support_request_id=support_request_id, ticket_created=ticket_created, draft=draft, reply=reply)
