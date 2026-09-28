from math import ceil
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.product import Product
from app.models.product_image import MediaAsset, ProductImage
from app.schemas.media import MediaAssetPage, MediaAssetPublic, MediaAssetUpdate, MediaUsage
from app.services.activity_services import record_activity
from app.services.media_assets import create_or_reuse_asset
from app.services.product_media import MAX_UPLOAD, media_path

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]
Owner = Annotated[Admin, Depends(get_current_superuser)]
Reader = Annotated[Admin, Depends(get_current_admin)]


async def asset_output(db: AsyncSession, asset: MediaAsset, *, reused: bool = False) -> MediaAssetPublic:
    rows = (await db.execute(
        select(ProductImage, Product.name)
        .join(Product, Product.id == ProductImage.product_id)
        .where(ProductImage.media_asset_id == asset.id)
        .order_by(Product.name, ProductImage.position)
    )).all()
    usages = [MediaUsage(product_id=item.product_id, product_name=name, placement_id=item.id, position=item.position) for item, name in rows]
    return MediaAssetPublic.model_validate(asset).model_copy(update={"usage_count": len(usages), "usages": usages, "was_reused": reused})


@router.get("", response_model=MediaAssetPage)
async def list_media(
    db: DB,
    _: Reader,
    search: str = Query(default="", max_length=120),
    status: Literal["active", "archived", "all"] = "active",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=48),
):
    filters = []
    if status != "all":
        filters.append(MediaAsset.is_archived.is_(status == "archived"))
    if search.strip():
        pattern = f"%{search.strip()}%"
        filters.append(or_(MediaAsset.title.ilike(pattern), MediaAsset.note.ilike(pattern)))
    total = int(await db.scalar(select(func.count(MediaAsset.id)).where(*filters)) or 0)
    assets = (await db.scalars(
        select(MediaAsset).where(*filters).order_by(MediaAsset.created_at.desc(), MediaAsset.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )).all()
    return MediaAssetPage(
        items=[await asset_output(db, asset) for asset in assets],
        page=page,
        page_size=page_size,
        total=total,
        pages=max(1, ceil(total / page_size)),
    )


@router.post("", response_model=MediaAssetPublic, status_code=201)
async def upload_media(file: Annotated[UploadFile, File()], db: DB, owner: Owner):
    data = await file.read(MAX_UPLOAD + 1)
    await file.close()
    asset, reused = await create_or_reuse_asset(db, data=data, filename=file.filename, admin_id=owner.id)
    try:
        await record_activity(
            db, admin=owner, action="reused" if reused else "created", entity_type="media_asset", entity_id=asset.id,
            description=f"{'Reused' if reused else 'Uploaded'} media asset {asset.title}.",
        )
        await db.commit()
    except Exception:
        await db.rollback()
        if not reused:
            media_path(asset.storage_key).unlink(missing_ok=True)
        raise
    await db.refresh(asset)
    return await asset_output(db, asset, reused=reused)


@router.get("/{asset_id}/content")
async def read_media(asset_id: int, db: DB, _: Reader):
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    path = media_path(asset.storage_key, asset.legacy)
    if not path.is_file() or path.suffix.lower() not in {".webp", ".jpg", ".jpeg", ".png"}:
        raise HTTPException(404, "Media file not found.")
    media_type = asset.mime_type or {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}[path.suffix.lower()]
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.patch("/{asset_id}", response_model=MediaAssetPublic)
async def update_media(asset_id: int, data: MediaAssetUpdate, db: DB, owner: Owner):
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    asset.title, asset.note = data.title, data.note
    await record_activity(db, admin=owner, action="updated", entity_type="media_asset", entity_id=asset.id, description=f"Updated media asset {asset.title}.")
    await db.commit()
    await db.refresh(asset)
    return await asset_output(db, asset)


@router.post("/{asset_id}/archive", response_model=MediaAssetPublic)
async def archive_media(asset_id: int, db: DB, owner: Owner):
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    asset.is_archived = True
    await record_activity(db, admin=owner, action="archived", entity_type="media_asset", entity_id=asset.id, description=f"Archived media asset {asset.title}.")
    await db.commit()
    await db.refresh(asset)
    return await asset_output(db, asset)


@router.post("/{asset_id}/restore", response_model=MediaAssetPublic)
async def restore_media(asset_id: int, db: DB, owner: Owner):
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    asset.is_archived = False
    await record_activity(db, admin=owner, action="restored", entity_type="media_asset", entity_id=asset.id, description=f"Restored media asset {asset.title}.")
    await db.commit()
    await db.refresh(asset)
    return await asset_output(db, asset)


@router.delete("/{asset_id}", status_code=204)
async def delete_media(asset_id: int, db: DB, owner: Owner):
    asset = await db.scalar(select(MediaAsset).where(MediaAsset.id == asset_id).with_for_update())
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    if not asset.is_archived:
        raise HTTPException(409, "Archive this asset before deleting it permanently.")
    if await db.scalar(select(func.count(ProductImage.id)).where(ProductImage.media_asset_id == asset.id)):
        raise HTTPException(409, "Remove this asset from every product before deleting it permanently.")
    path = media_path(asset.storage_key, asset.legacy)
    staged = path.with_name(f".{path.name}.deleting-{uuid4().hex}")
    if path.is_file():
        path.replace(staged)
    try:
        await record_activity(db, admin=owner, action="deleted", entity_type="media_asset", entity_id=asset.id, description=f"Permanently deleted media asset {asset.title}.")
        await db.delete(asset)
        await db.commit()
    except Exception:
        await db.rollback()
        if staged.is_file():
            staged.replace(path)
        raise
    staged.unlink(missing_ok=True)
