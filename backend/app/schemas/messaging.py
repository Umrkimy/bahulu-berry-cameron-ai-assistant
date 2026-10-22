from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.support import SupportDraftPublic


class InboundMessageResult(BaseModel):
    outcome: str
    duplicate: bool
    support_request_id: int | None = None
    ticket_created: bool = False
    draft: SupportDraftPublic | None = None
    reply: str | None = None


class SupportMessagingConversationPublic(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    provider: str
    support_request_id: int


class SupportConversationPublic(BaseModel):
    id: int
    provider: str
    contact_reference: str | None
    language: str | None
    support_request_id: int | None
    handoff_state: str
    assigned_admin_id: int | None
    last_message: str | None
    last_direction: str
    last_at: datetime
    pending_drafts: int


class SupportMessagePublic(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    direction: str
    outcome: str
    content: str | None
    author_admin_id: int | None
    processed_at: datetime
    expires_at: datetime | None


class DashboardReplyInput(BaseModel):
    content: str = Field(min_length=1, max_length=2_000)


class WhatsAppLinkPublic(BaseModel):
    url: str
