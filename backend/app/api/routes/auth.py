from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.auth.jwt import create_access_token
from app.auth.password import hash_password, verify_password
from app.core.config import settings
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.auth import Token
from app.schemas.admin import (
    AdminCreate,
    AdminPrivate,
)

router = APIRouter()


@router.post(
    "/token",
    response_model=Token,
)
async def login(
    form_data: Annotated[
        OAuth2PasswordRequestForm,
        Depends(),
    ],
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
):
    result = await db.execute(
        select(Admin).where(func.lower(Admin.email) == form_data.username.lower())
    )

    admin = result.scalar_one_or_none()

    if admin is None or not verify_password(
        form_data.password,
        admin.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={
                "WWW-Authenticate": "Bearer",
            },
        )

    access_token = create_access_token(
        data={
            "sub": str(admin.id),
            "is_superuser": admin.is_superuser,
        },
        expires_delta=timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        ),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
    )


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


@router.post(
    "/admins",
    response_model=AdminPrivate,
    status_code=status.HTTP_201_CREATED,
)
async def create_admin(
    admin_data: AdminCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):

    result = await db.execute(
        select(Admin).where(func.lower(Admin.username) == admin_data.username.lower())
    )

    existing_username = result.scalar_one_or_none()

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists",
        )

    result = await db.execute(
        select(Admin).where(func.lower(Admin.email) == admin_data.email.lower())
    )

    existing_email = result.scalar_one_or_none()

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists",
        )

    admin = Admin(
        username=admin_data.username,
        email=admin_data.email.lower(),
        password_hash=hash_password(admin_data.password),
        is_superuser=admin_data.is_superuser,
    )

    db.add(admin)

    await db.commit()
    await db.refresh(admin)

    return admin
