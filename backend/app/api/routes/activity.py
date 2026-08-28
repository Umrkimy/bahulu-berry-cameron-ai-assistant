from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.schemas.activity import ActivityPublic


router = APIRouter()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


@router.get("", response_model=list[ActivityPublic])
async def list_activity(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
    entity_type: str | None = None,
    action: str | None = None,
    admin_id: int | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = select(ActivityLog).order_by(ActivityLog.created_at.desc())
    if entity_type:
        query = query.where(ActivityLog.entity_type == entity_type)
    if action:
        query = query.where(ActivityLog.action == action)
    if admin_id:
        query = query.where(ActivityLog.admin_id == admin_id)
    if start_at:
        query = query.where(ActivityLog.created_at >= _as_utc(start_at))
    if end_at:
        query = query.where(ActivityLog.created_at < _as_utc(end_at))
    result = await db.execute(query.offset(offset).limit(limit))
    return result.scalars().all()
