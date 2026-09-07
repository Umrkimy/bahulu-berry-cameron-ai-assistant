from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.core.rate_limit import AI_LIMIT, STAFF_AI_LIMIT, rate_limiter
from app.models.admin import Admin
from app.schemas.ai_assistant import AIChatRequest, AIChatResponse
from app.services.ai_assistant_services import generate_ai_result


router = APIRouter()


@router.post(
    "/chat",
    response_model=AIChatResponse,
)
async def chat(
    request: Request,
    chat_request: AIChatRequest,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    is_owner = current_admin.role == "OWNER"
    await rate_limiter.check(
        request,
        f"ai-chat-{'owner' if is_owner else 'staff'}:{current_admin.id}",
        AI_LIMIT if is_owner else STAFF_AI_LIMIT,
    )
    result = await generate_ai_result(
        db=db,
        message=chat_request.message,
        conversation_id=str(chat_request.conversation_id),
        admin_id=current_admin.id,
        conversation_history=chat_request.conversation_history,
        is_owner=is_owner,
    )

    return AIChatResponse(
        response=result.response,
        cards=result.cards,
        outcome=result.outcome,
    )
