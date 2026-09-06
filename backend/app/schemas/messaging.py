from pydantic import BaseModel, Field

from app.schemas.support import SupportDraftPublic


class SimulatorInboundInput(BaseModel):
    message_id: str = Field(min_length=2, max_length=160)
    conversation_id: str = Field(min_length=2, max_length=160)
    sender_reference: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=2, max_length=2_000)
    language: str = Field(default="AUTO", pattern="^(AUTO|EN|MS)$")


class SimulatorInboundPublic(BaseModel):
    outcome: str
    duplicate: bool
    support_request_id: int | None = None
    ticket_created: bool = False
    draft: SupportDraftPublic | None = None
