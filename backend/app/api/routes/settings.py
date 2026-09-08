from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.core.config import settings
from app.core.rate_limit import PASSWORD_RESET_LIMIT, rate_limiter
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.settings import EmailConfigurationStatus, OwnerPasswordResetResponse
from app.services.activity_services import record_activity
from app.services.email_services import send_password_setup_email


router = APIRouter()


@router.get("/email-status", response_model=EmailConfigurationStatus)
async def email_status(_: Annotated[Admin, Depends(get_current_superuser)]):
    provider = settings.EMAIL_PROVIDER.lower().strip()
    if provider == "resend":
        delivery_enabled = bool(settings.RESEND_API_KEY.get_secret_value())
        return EmailConfigurationStatus(
            mode="delivery" if delivery_enabled else "not_configured",
            delivery_enabled=delivery_enabled,
            sender=settings.EMAIL_FROM if delivery_enabled else None,
            reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES,
        )
    if provider == "console":
        return EmailConfigurationStatus(mode="test", delivery_enabled=False, reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    return EmailConfigurationStatus(mode="not_configured", delivery_enabled=False, reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)


@router.post("/password-reset/{admin_id}", response_model=OwnerPasswordResetResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_owner_password_reset(
    admin_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await rate_limiter.check(request, "owner-password-reset", PASSWORD_RESET_LIMIT)
    member = await db.get(Admin, admin_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found.")
    if not member.is_active:
        raise HTTPException(status_code=400, detail="Password reset links can only be sent to active team members.")

    await send_password_setup_email(db, member)
    await record_activity(db, admin=current_admin, action="password_reset_requested", entity_type="admin", entity_id=member.id, description=f"Requested a password reset link for {member.username}.")
    await db.commit()
    return OwnerPasswordResetResponse(message="A secure reset link has been requested for the selected account.")
