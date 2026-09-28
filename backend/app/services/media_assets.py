from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.models.product_image import MediaAsset
from app.services.product_media import media_path, save_media


def upload_title(filename: str | None) -> str:
    value = Path(filename or "Product photo").stem.replace("_", " ").replace("-", " ")
    return " ".join(value.split())[:120] or "Product photo"


async def create_or_reuse_asset(
    db: AsyncSession, *, data: bytes, filename: str | None, admin_id: int
) -> tuple[MediaAsset, bool]:
    saved = await run_in_threadpool(save_media, data)
    existing = await db.scalar(select(MediaAsset).where(MediaAsset.sha256 == saved.sha256))
    if existing is not None:
        media_path(saved.filename).unlink(missing_ok=True)
        if existing.is_archived:
            raise HTTPException(409, detail={"code": "ASSET_ARCHIVED", "asset_id": existing.id, "message": "This photo is archived. Restore it before using it."})
        return existing, True

    asset = MediaAsset(
        storage_key=saved.filename,
        title=upload_title(filename),
        mime_type=saved.mime_type,
        width=saved.width,
        height=saved.height,
        byte_size=saved.byte_size,
        sha256=saved.sha256,
        legacy=False,
        created_by_admin_id=admin_id,
    )
    try:
        async with db.begin_nested():
            db.add(asset)
            await db.flush()
    except IntegrityError:
        media_path(saved.filename).unlink(missing_ok=True)
        existing = await db.scalar(select(MediaAsset).where(MediaAsset.sha256 == saved.sha256))
        if existing is None:
            raise
        if existing.is_archived:
            raise HTTPException(409, detail={"code": "ASSET_ARCHIVED", "asset_id": existing.id, "message": "This photo is archived. Restore it before using it."})
        return existing, True
    return asset, False
