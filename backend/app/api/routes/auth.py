from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.auth.jwt import create_access_token
from app.auth.password import verify_password
from app.core.config import settings
from app.core.rate_limit import LOGIN_LIMIT, rate_limiter
from app.core.security import clear_auth_cookies, create_csrf_token, set_csrf_cookie, set_session_cookie
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.auth import LoginResponse
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
async def logout(response: Response):
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
