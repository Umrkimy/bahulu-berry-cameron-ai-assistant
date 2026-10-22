from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.admin import Admin
from app.models.support_rating import SupportRating
from app.schemas.pagination import PaginatedResponse
from app.schemas.support_rating import StaffRatingSummary, SupportRatingPublic
from app.services.whatsapp_menu import LOW_SCORE

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]
CurrentAdmin = Annotated[Admin, Depends(get_current_admin)]


def _visible_to(admin: Admin):
    """Owners see everyone, managers see staff and themselves, staff see only themselves."""
    if admin.role == "OWNER":
        return True
    if admin.role == "MANAGER":
        return or_(Admin.role == "STAFF", Admin.id == admin.id)
    return Admin.id == admin.id


def _since(days: int) -> datetime:
    if not 1 <= days <= 365:
        raise HTTPException(422, detail="Choose between 1 and 365 days.")
    return datetime.now(UTC) - timedelta(days=days)


@router.get("/summary", response_model=list[StaffRatingSummary])
async def rating_summary(db: DB, admin: CurrentAdmin, days: int = 30):
    since = _since(days)
    rows = (await db.execute(
        select(Admin.id, Admin.username, Admin.role, func.count(SupportRating.id), func.avg(SupportRating.score), func.sum(case((SupportRating.score <= LOW_SCORE, 1), else_=0)))
        .join(SupportRating, SupportRating.admin_id == Admin.id)
        .where(SupportRating.score.is_not(None), SupportRating.rated_at >= since, _visible_to(admin))
        .group_by(Admin.id, Admin.username, Admin.role)
        .order_by(func.avg(SupportRating.score).desc(), Admin.username.asc())
    )).all()
    return [StaffRatingSummary(admin_id=row[0], username=row[1], role=row[2], ratings=row[3], average=round(float(row[4]), 2) if row[4] is not None else None, low=int(row[5] or 0)) for row in rows]


@router.get("", response_model=PaginatedResponse[SupportRatingPublic])
async def ratings(db: DB, admin: CurrentAdmin, days: int = 30, admin_id: int | None = None, low_only: bool = False, page: int = 1, page_size: int = 20):
    if page < 1 or not 1 <= page_size <= 100:
        raise HTTPException(422, detail="Invalid pagination settings.")
    filters = [SupportRating.score.is_not(None), SupportRating.rated_at >= _since(days), _visible_to(admin)]
    if admin_id is not None:
        filters.append(SupportRating.admin_id == admin_id)
    if low_only:
        filters.append(SupportRating.flagged.is_(True))
    query = select(SupportRating, Admin.username).join(Admin, Admin.id == SupportRating.admin_id).where(*filters)
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    rows = (await db.execute(query.order_by(SupportRating.rated_at.desc(), SupportRating.id.desc()).offset((page - 1) * page_size).limit(page_size))).all()
    items = [SupportRatingPublic(id=rating.id, admin_id=rating.admin_id, username=username, score=rating.score, comment=rating.comment, flagged=rating.flagged, rated_at=rating.rated_at, support_request_id=rating.support_request_id) for rating, username in rows]
    return PaginatedResponse.create(items=items, page=page, page_size=page_size, total=total or 0)
