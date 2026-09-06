from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.ai_usage import AIUsage
from app.schemas.ai_usage import AIUsagePublic, AIUsageSummary
from app.services.ai_usage_services import get_usage_summary


router = APIRouter()


@router.get("/summary", response_model=AIUsageSummary)
async def summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
):
    return await get_usage_summary(db)


@router.get("", response_model=list[AIUsagePublic])
async def list_usage(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    return (await db.execute(select(AIUsage).order_by(AIUsage.created_at.desc()).offset(offset).limit(limit))).scalars().all()
