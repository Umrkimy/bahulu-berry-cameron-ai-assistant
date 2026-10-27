from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.whatsapp_menu_copy import WhatsAppMenuCopy
from app.schemas.whatsapp_menu import MenuCopy, MenuCopyResponse, MenuCopyUpdate
from app.services.activity_services import record_activity
from app.services.whatsapp_menu import DEFAULT_COPY, TEXT_PLACEHOLDERS, merge_copy

router = APIRouter()


async def _record(db: AsyncSession) -> WhatsAppMenuCopy:
    record = await db.scalar(select(WhatsAppMenuCopy).where(WhatsAppMenuCopy.id == 1).execution_options(populate_existing=True))
    if record is None:
        record = WhatsAppMenuCopy(id=1, overrides={}, version=1)
        db.add(record)
        await db.flush()
    return record


def _response(record: WhatsAppMenuCopy) -> MenuCopyResponse:
    overrides = record.overrides or {}
    return MenuCopyResponse(
        defaults=MenuCopy.model_validate(DEFAULT_COPY),
        current=MenuCopy.model_validate({language: merge_copy(DEFAULT_COPY[language], overrides.get(language) or {}) for language in DEFAULT_COPY}),
        placeholders={key: list(names) for key, names in TEXT_PLACEHOLDERS.items()},
        version=record.version,
        updated_at=record.updated_at,
    )


def _changes(copy: MenuCopy) -> dict:
    overrides: dict = {}
    for language, defaults in DEFAULT_COPY.items():
        submitted = getattr(copy, language).model_dump()
        changed = {key: value for key, value in submitted.items() if key != "statuses" and value != defaults[key]}
        statuses = {key: value for key, value in submitted["statuses"].items() if value != defaults["statuses"][key]}
        if statuses:
            changed["statuses"] = statuses
        if changed:
            overrides[language] = changed
    return overrides


@router.get("", response_model=MenuCopyResponse)
async def get_whatsapp_menu_copy(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
):
    record = await _record(db)
    await db.commit()
    return _response(record)


@router.put("", response_model=MenuCopyResponse)
async def update_whatsapp_menu_copy(
    payload: MenuCopyUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await _record(db)
    overrides = _changes(payload.copy_text)
    result = await db.execute(
        update(WhatsAppMenuCopy)
        .where(WhatsAppMenuCopy.id == 1, WhatsAppMenuCopy.version == payload.expected_version)
        .values(overrides=overrides, version=payload.expected_version + 1, updated_by_admin_id=current_admin.id, updated_at=datetime.now(UTC))
    )
    if result.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Berry's menu text changed in another session. Reload it before saving again.")
    changed = sorted(f"{language}.{key}" for language, keys in overrides.items() for key in keys)
    await record_activity(
        db, admin=current_admin, action="whatsapp_menu_text_saved",
        entity_type="whatsapp_menu_copy", entity_id=1,
        description="Saved Berry's WhatsApp menu text.",
        metadata={"version": payload.expected_version + 1, "changed": changed},
    )
    await db.commit()
    return _response(await _record(db))
