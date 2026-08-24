from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
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
):

    response = await generate_ai_response(
        db=db,
        message=request.message,
    )

    return AIChatResponse(
        response=response,
    )