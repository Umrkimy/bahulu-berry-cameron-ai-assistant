from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


class AIChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2_000)


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2_000)
    conversation_id: UUID
    conversation_history: list[AIChatMessage] = Field(default_factory=list, max_length=12)


class AIOperationCard(BaseModel):
    title: str
    facts: list[str] = Field(default_factory=list, max_length=6)
    tone: Literal["info", "warning", "success"] = "info"
    href: str | None = None


class AIChatResponse(BaseModel):
    response: str
    cards: list[AIOperationCard] = Field(default_factory=list)
