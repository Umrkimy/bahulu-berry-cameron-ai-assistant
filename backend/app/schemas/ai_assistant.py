from typing import Literal

from pydantic import BaseModel


class AIChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AIChatRequest(BaseModel):
    message: str
    conversation_history: list[AIChatMessage] = []


class AIChatResponse(BaseModel):
    response: str