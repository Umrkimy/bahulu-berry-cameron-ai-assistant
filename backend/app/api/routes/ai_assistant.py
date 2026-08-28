from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.ai_assistant import AIChatRequest, AIChatResponse
from app.services.ai_assistant_services import generate_ai_response


router = APIRouter()


@router.post(
    "/chat",
    response_model=AIChatResponse,
)
async def chat(
    request: AIChatRequest,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    response = await generate_ai_response(
        db=db,
        message=request.message,
        conversation_id=str(request.conversation_id),
        admin_id=current_admin.id,
        conversation_history=request.conversation_history,
        is_owner=current_admin.role == "OWNER",
    )

    return AIChatResponse(
        response=response,
    )
