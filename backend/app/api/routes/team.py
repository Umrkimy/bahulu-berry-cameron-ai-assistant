from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.auth.password import hash_password
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.admin import AdminCreate, AdminPrivate, AdminUpdate
from app.services.activity_services import record_activity


router = APIRouter()
VALID_ROLES = {"OWNER", "STAFF"}


async def _active_owner_count(db: AsyncSession) -> int:
    return (await db.execute(select(func.count()).select_from(Admin).where(Admin.role == "OWNER", Admin.is_active.is_(True)))).scalar_one()


def _validate_role(role: str) -> str:
    value = role.upper()
    if value not in VALID_ROLES:
        raise HTTPException(status_code=422, detail="Role must be OWNER or STAFF.")
    return value


@router.get("", response_model=list[AdminPrivate])
async def list_team(db: Annotated[AsyncSession, Depends(get_db)], current_admin: Annotated[Admin, Depends(get_current_superuser)]):
    return (await db.execute(select(Admin).order_by(Admin.is_active.desc(), Admin.username))).scalars().all()


@router.post("", response_model=AdminPrivate, status_code=status.HTTP_201_CREATED)
async def create_team_member(data: AdminCreate, db: Annotated[AsyncSession, Depends(get_db)], current_admin: Annotated[Admin, Depends(get_current_superuser)]):
    role = _validate_role(data.role)
    existing = (await db.execute(select(Admin).where((func.lower(Admin.username) == data.username.lower()) | (func.lower(Admin.email) == data.email.lower())))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists.")
    admin = Admin(username=data.username.strip(), email=data.email.lower(), password_hash=hash_password(data.password), role=role, is_superuser=role == "OWNER", is_active=True)
    db.add(admin)
    await db.flush()
    await record_activity(db, admin=current_admin, action="created", entity_type="admin", entity_id=admin.id, description=f"Created {role.lower()} account for {admin.username}.")
    await db.commit()
    await db.refresh(admin)
    return admin


@router.patch("/{admin_id}", response_model=AdminPrivate)
async def update_team_member(admin_id: int, data: AdminUpdate, db: Annotated[AsyncSession, Depends(get_db)], current_admin: Annotated[Admin, Depends(get_current_superuser)]):
    member = await db.get(Admin, admin_id)
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found.")
    changes = data.model_dump(exclude_unset=True)
    if "role" in changes:
        changes["role"] = _validate_role(changes["role"])
        if member.role == "OWNER" and changes["role"] != "OWNER" and member.is_active and await _active_owner_count(db) <= 1:
            raise HTTPException(status_code=400, detail="The last active owner cannot be demoted.")
        changes["is_superuser"] = changes["role"] == "OWNER"
    if changes.get("is_active") is False and member.role == "OWNER" and member.is_active and await _active_owner_count(db) <= 1:
        raise HTTPException(status_code=400, detail="The last active owner cannot be deactivated.")
    if "password" in changes:
        changes["password_hash"] = hash_password(changes.pop("password"))
    if "email" in changes:
        changes["email"] = changes["email"].lower()
    for field, value in changes.items():
        setattr(member, field, value)
    await record_activity(db, admin=current_admin, action="updated", entity_type="admin", entity_id=member.id, description=f"Updated team account for {member.username}.", metadata={"fields": sorted(changes.keys())})
    await db.commit()
    await db.refresh(member)
    return member
