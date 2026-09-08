from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.admin import Admin
from app.models.notification import Notification
from app.schemas.notification import NotificationPage, NotificationPublic, NotificationUnreadCount
from app.schemas.pagination import PaginatedResponse


router = APIRouter()


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


@router.get("", response_model=NotificationPage)
async def list_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    admin: Annotated[Admin, Depends(get_current_admin)],
    unread_only: bool = False,
    notification_type: str | None = None,
    start_at: datetime | None = None,
    end_at: datetime | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    filters = [Notification.admin_id == admin.id]
    if unread_only:
        filters.append(Notification.read_at.is_(None))
    if notification_type:
        filters.append(Notification.notification_type == notification_type)
    if start_at:
        filters.append(Notification.created_at >= _as_utc(start_at))
    if end_at:
        filters.append(Notification.created_at < _as_utc(end_at))
    total = await db.scalar(select(func.count()).select_from(Notification).where(*filters)) or 0
    result = await db.execute(
        select(Notification).where(*filters).order_by(Notification.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    return PaginatedResponse.create(items=result.scalars().all(), page=page, page_size=page_size, total=total)


@router.get("/unread-count", response_model=NotificationUnreadCount)
async def unread_count(db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    count = await db.scalar(
        select(func.count()).select_from(Notification).where(Notification.admin_id == admin.id, Notification.read_at.is_(None))
    )
    return NotificationUnreadCount(unread_count=count or 0)


@router.post("/read-all", status_code=204)
async def read_all_notifications(db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    result = await db.execute(
        select(Notification).where(Notification.admin_id == admin.id, Notification.read_at.is_(None)).with_for_update()
    )
    now = datetime.now(UTC)
    for item in result.scalars().all():
        item.read_at = now
    await db.commit()


@router.patch("/{notification_id}/read", response_model=NotificationPublic)
async def read_notification(notification_id: int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_admin)]):
    item = await db.scalar(
        select(Notification).where(Notification.id == notification_id, Notification.admin_id == admin.id).with_for_update()
    )
    if item is None:
        raise HTTPException(404, detail="Notification not found.")
    if item.read_at is None:
        item.read_at = datetime.now(UTC)
        await db.commit()
        await db.refresh(item)
    return item
