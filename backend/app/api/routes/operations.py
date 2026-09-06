from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.operations import OperationAlertPage
from app.services.operations_services import get_operation_alerts


router = APIRouter()


@router.get("/alerts", response_model=OperationAlertPage)
async def alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
    category: str | None = Query(default=None, pattern="^(INVENTORY|ORDER|SUPPORT|REFUND)$"),
    severity: str | None = Query(default=None, pattern="^(CRITICAL|WARNING)$"),
    search: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=25, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return await get_operation_alerts(
        db=db,
        current_admin=current_admin,
        category=category,
        severity=severity,
        search=search,
        limit=limit,
        offset=offset,
    )
