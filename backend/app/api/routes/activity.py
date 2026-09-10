from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.schemas.activity import ActivityListPublic, ActivityPublic


router = APIRouter()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


@router.get("", response_model=ActivityListPublic)
async def list_activity(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
    entity_type: str | None = None,
    entity_id: int | None = None,
    action: str | None = None,
    admin_id: int | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    filters = []
    if entity_type:
        filters.append(ActivityLog.entity_type == entity_type)
    if entity_id is not None:
        filters.append(ActivityLog.entity_id == entity_id)
    if action:
        filters.append(ActivityLog.action == action)
    if admin_id:
        filters.append(ActivityLog.admin_id == admin_id)
    if start_at:
        filters.append(ActivityLog.created_at >= _as_utc(start_at))
    if end_at:
        filters.append(ActivityLog.created_at < _as_utc(end_at))
    query = select(ActivityLog, Admin.username).outerjoin(Admin, Admin.id == ActivityLog.admin_id).where(*filters).order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
    total = await db.scalar(select(func.count(ActivityLog.id)).where(*filters))
    result = await db.execute(query.offset(offset).limit(limit))
    return ActivityListPublic(items=[ActivityPublic.model_validate(activity).model_copy(update={"admin_username": username}) for activity, username in result.all()], total=total or 0)
