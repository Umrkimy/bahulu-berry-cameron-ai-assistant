from dataclasses import dataclass
from hashlib import sha256
import hmac
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.admin import Admin
from app.models.messaging import MessagingConversation, MessagingEvent
from app.models.support import SupportRequest
from app.schemas.messaging import SimulatorInboundInput, SimulatorInboundPublic
from app.services.activity_services import record_activity
from app.services.support_copilot import create_grounded_draft


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


class SimulatorAdapter:
    provider = "SIMULATOR"

    def normalize_inbound(self, payload: SimulatorInboundInput) -> NormalizedInboundMessage:
        return NormalizedInboundMessage(
            provider=self.provider,
            external_message_id=payload.message_id.strip(),
            external_conversation_id=payload.conversation_id.strip(),
            sender_reference=payload.sender_reference.strip(),
            message=payload.message.strip(),
            language=payload.language,
        )

    def verify_inbound(self, payload: object) -> bool:
        return isinstance(payload, SimulatorInboundInput)

    async def send_template(self, *, recipient: str, template_name: str, variables: dict[str, str]) -> str:
        raise RuntimeError("Outbound messaging is not enabled.")


def _payload_hash(message: str) -> str:
    return hmac.new(settings.SECRET_KEY.get_secret_value().encode(), message.encode(), sha256).hexdigest()


async def process_inbound_message(db: AsyncSession, *, message: NormalizedInboundMessage, actor: Admin) -> SimulatorInboundPublic:
    existing = await db.scalar(select(MessagingEvent).where(MessagingEvent.provider == message.provider, MessagingEvent.external_message_id == message.external_message_id))
    if existing is not None:
        return SimulatorInboundPublic(outcome="DUPLICATE", duplicate=True, support_request_id=existing.support_request_id)

    conversation = await db.scalar(select(MessagingConversation).where(MessagingConversation.provider == message.provider, MessagingConversation.external_conversation_id == message.external_conversation_id))
    if conversation is None:
        conversation = MessagingConversation(provider=message.provider, external_conversation_id=message.external_conversation_id)
        db.add(conversation)
        await db.flush()

    draft = await create_grounded_draft(db, message=message.message, requested_language=message.language)
    support_request_id: int | None = conversation.support_request_id
    ticket_created = False
    outcome = "DRAFTED"
    if draft.handoff_required:
        outcome = "HANDOFF"
        if support_request_id is None:
            ticket = SupportRequest(
                customer_name="WhatsApp customer",
                contact=None,
                source="WHATSAPP_FUTURE",
                subject="WhatsApp support handoff",
                notes=None,
                handoff_reason=draft.handoff_reason,
                priority="HIGH",
                status="NEW",
                assigned_admin_id=None,
            )
            db.add(ticket)
            await db.flush()
            conversation.support_request_id = ticket.id
            support_request_id = ticket.id
            ticket_created = True
            await record_activity(db, admin=actor, action="created", entity_type="support_request", entity_id=ticket.id, description=f"Created support request #{ticket.id} from a fictional WhatsApp handoff.")

    event = MessagingEvent(
        provider=message.provider,
        external_message_id=message.external_message_id,
        conversation_id=conversation.id,
        support_request_id=support_request_id,
        direction="INBOUND",
        outcome=outcome,
        payload_hash=_payload_hash(message.message),
    )
    db.add(event)
    await db.flush()
    await record_activity(
        db,
        admin=actor,
        action="processed",
        entity_type="messaging_event",
        entity_id=event.id,
        description="Processed a fictional inbound message into a human handoff." if outcome == "HANDOFF" else "Processed a fictional inbound message into a grounded draft.",
        metadata={"provider": message.provider, "outcome": outcome, "support_request_id": support_request_id},
    )
    await db.commit()
    return SimulatorInboundPublic(outcome=outcome, duplicate=False, support_request_id=support_request_id, ticket_created=ticket_created, draft=draft)
