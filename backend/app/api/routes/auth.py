from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.core.config import settings
from app.core.rate_limit import LOGIN_LIMIT, PASSWORD_RESET_CONFIRM_LIMIT, PASSWORD_RESET_LIMIT, rate_limiter
from app.core.security import clear_auth_cookies, create_csrf_token, set_csrf_cookie, set_session_cookie
from app.db.database import get_db
from app.models.admin import Admin
from app.models.password_reset_token import PasswordResetToken
from app.schemas.auth import LoginResponse
from app.schemas.email import PasswordResetConfirm, PasswordResetRequest, PasswordResetResponse
from app.services.activity_services import record_activity
from app.services.email_services import _hash_token, send_password_setup_email
from app.schemas.admin import (
    AdminPrivate,
)

router = APIRouter()


@router.post(
    "/token",
    response_model=LoginResponse,
)
async def login(
    request: Request,
    response: Response,
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
):
    await rate_limiter.check(request, "login", LOGIN_LIMIT)
    result = await db.execute(
        select(Admin).where(func.lower(Admin.email) == form_data.username.lower())
    )

    admin = result.scalar_one_or_none()

    if admin is None or not admin.is_active or not verify_password(
        form_data.password,
        admin.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    access_token = create_access_token(
        data={
            "sub": str(admin.id),
            "is_superuser": admin.role == "OWNER",
            "sv": admin.session_version,
        },
        expires_delta=timedelta(
            minutes=settings.SESSION_EXPIRE_MINUTES,
        ),
    )

    set_session_cookie(response, access_token)
    if not request.cookies.get(settings.CSRF_COOKIE_NAME):
        set_csrf_cookie(response, create_csrf_token())
    return LoginResponse(authenticated=True)


@router.get("/csrf")
async def csrf(response: Response):
    token = create_csrf_token()
    set_csrf_cookie(response, token)
    return {"csrf_token": token}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookies(response)
    return response


@router.get(
    "/me",
    response_model=AdminPrivate,
)
async def me(
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    return current_admin


@router.post("/password-reset/request", response_model=PasswordResetResponse)
async def request_password_reset(data: PasswordResetRequest, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    await rate_limiter.check(request, "password-reset-request", PASSWORD_RESET_LIMIT)
    admin = await db.scalar(select(Admin).where(func.lower(Admin.email) == data.email.lower(), Admin.is_active.is_(True)))
    # The response must remain identical whether the address belongs to an account or not.
    if admin is not None:
        await send_password_setup_email(db, admin)
        await db.commit()
    return PasswordResetResponse(message="If an active account matches that email, a secure reset link has been sent.")


@router.post("/password-reset/confirm", response_model=PasswordResetResponse)
async def confirm_password_reset(data: PasswordResetConfirm, request: Request, db: Annotated[AsyncSession, Depends(get_db)]):
    await rate_limiter.check(request, "password-reset-confirm", PASSWORD_RESET_CONFIRM_LIMIT)
    token = await db.scalar(select(PasswordResetToken).where(PasswordResetToken.token_hash == _hash_token(data.token)).with_for_update())
    now = datetime.now(UTC)
    if token is None or token.used_at is not None or token.expires_at <= now:
        raise HTTPException(status_code=400, detail="This password link is invalid or has expired. Request a new one and try again.")
    admin = await db.get(Admin, token.admin_id)
    if admin is None or not admin.is_active:
        raise HTTPException(status_code=400, detail="This password link is invalid or has expired. Request a new one and try again.")
    admin.password_hash = hash_password(data.password)
    admin.session_version += 1
    token.used_at = now
    await db.execute(update(PasswordResetToken).where(PasswordResetToken.admin_id == admin.id, PasswordResetToken.used_at.is_(None)).values(used_at=now))
    await record_activity(db, admin=admin, action="password_reset", entity_type="admin", entity_id=admin.id, description="Password reset completed.")
    await db.commit()
    return PasswordResetResponse(message="Your password has been reset. Please sign in with your new password.")
