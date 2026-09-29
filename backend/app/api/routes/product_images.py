from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.product import Product
from app.models.product_image import MediaAsset, ProductImage
from app.schemas.media import MediaAttachment
from app.schemas.product import ProductImageAdmin
from app.services.activity_services import record_activity
from app.services.media_assets import create_or_reuse_asset
from app.services.product_media import MAX_UPLOAD, media_path

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]
Owner = Annotated[Admin, Depends(get_current_superuser)]
Reader = Annotated[Admin, Depends(get_current_admin)]


async def locked_product(db, product_id):
    product = await db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if product is None:
        raise HTTPException(404, "Product not found.")
    await db.refresh(product, ["images"])
    return product


async def log_change(db, owner, product_id, action):
    await record_activity(db, admin=owner, action="updated", entity_type="product", entity_id=product_id, description=action)


@router.get("/{product_id}/images", response_model=list[ProductImageAdmin])
async def list_images(product_id: int, db: DB, _: Reader):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "Product not found.")
    return product.images


def image_response(image):
    path = media_path(image.asset.storage_key, image.asset.legacy)
    if not path.is_file():
        raise HTTPException(404, "Product image not found.")
    # Windows MIME registrations may not include WebP. Do not let a valid upload
    # become text/plain (and fail the storefront's strict image proxy).
    media_type = {".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}.get(path.suffix.lower())
    if media_type is None:
        raise HTTPException(404, "Product image format is unavailable.")
    return FileResponse(path, media_type=media_type, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@router.get("/{product_id}/images/{image_id}/content")
async def read_image(product_id: int, image_id: int, db: DB, _: Reader):
    image = await db.scalar(select(ProductImage).where(ProductImage.id == image_id, ProductImage.product_id == product_id))
    if image is None:
        raise HTTPException(404, "Product image not found.")
    return image_response(image)


async def write_image(product_id, image_id, file, db, owner):
    data = await file.read(MAX_UPLOAD + 1)
    await file.close()
    product = await locked_product(db, product_id)
    image = next((item for item in product.images if item.id == image_id), None)
    if image_id is not None and image is None:
        raise HTTPException(404, "Product image not found.")
    if image is None and len(product.images) >= 6:
        raise HTTPException(422, "A product can have up to six photos.")
    asset, reused = await create_or_reuse_asset(db, data=data, filename=file.filename, admin_id=owner.id)
    if any(item.media_asset_id == asset.id and item.id != image_id for item in product.images):
        await db.rollback()
        if not reused:
            media_path(asset.storage_key).unlink(missing_ok=True)
        raise HTTPException(409, "This photo is already in the product gallery.")
    try:
        if image is None:
            image = ProductImage(product_id=product_id, media_asset_id=asset.id, position=len(product.images))
            db.add(image)
        else:
            image.media_asset_id = asset.id
            image.asset = asset
        await record_activity(
            db, admin=owner, action="reused" if reused else "created", entity_type="media_asset", entity_id=asset.id,
            description=f"{'Reused' if reused else 'Uploaded'} media asset {asset.title}.",
        )
        await log_change(db, owner, product_id, "Updated product gallery.")
        await db.commit()
    except Exception:
        await db.rollback()
        if not reused:
            media_path(asset.storage_key).unlink(missing_ok=True)
        raise
    await db.refresh(image)
    return ProductImageAdmin.model_validate(image).model_copy(update={"media_reused": reused})


@router.post("/{product_id}/images", response_model=ProductImageAdmin, status_code=201)
async def upload_image(product_id: int, file: Annotated[UploadFile, File()], db: DB, owner: Owner):
    return await write_image(product_id, None, file, db, owner)


@router.put("/{product_id}/images/{image_id}", response_model=ProductImageAdmin)
async def replace_image(product_id: int, image_id: int, file: Annotated[UploadFile, File()], db: DB, owner: Owner):
    return await write_image(product_id, image_id, file, db, owner)


async def available_asset(db: AsyncSession, asset_id: int) -> MediaAsset:
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise HTTPException(404, "Media asset not found.")
    if asset.is_archived:
        raise HTTPException(409, "Restore this media asset before using it.")
    if not media_path(asset.storage_key, asset.legacy).is_file():
        raise HTTPException(422, "The selected media file is unavailable.")
    return asset


@router.post("/{product_id}/images/attach", response_model=ProductImageAdmin, status_code=201)
async def attach_image(product_id: int, data: MediaAttachment, db: DB, owner: Owner):
    product = await locked_product(db, product_id)
    if len(product.images) >= 6:
        raise HTTPException(422, "A product can have up to six photos.")
    asset = await available_asset(db, data.asset_id)
    if any(item.media_asset_id == asset.id for item in product.images):
        raise HTTPException(409, "This photo is already in the product gallery.")
    image = ProductImage(product_id=product_id, media_asset_id=asset.id, position=len(product.images), asset=asset)
    db.add(image)
    await db.flush()
    await log_change(db, owner, product_id, f"Attached media asset {asset.id} to product gallery.")
    await db.commit()
    await db.refresh(image)
    return image


@router.put("/{product_id}/images/{image_id}/asset", response_model=ProductImageAdmin)
async def replace_with_asset(product_id: int, image_id: int, data: MediaAttachment, db: DB, owner: Owner):
    product = await locked_product(db, product_id)
    image = next((item for item in product.images if item.id == image_id), None)
    if image is None:
        raise HTTPException(404, "Product image not found.")
    asset = await available_asset(db, data.asset_id)
    if any(item.media_asset_id == asset.id and item.id != image_id for item in product.images):
        raise HTTPException(409, "This photo is already in the product gallery.")
    image.media_asset_id, image.asset = asset.id, asset
    await log_change(db, owner, product_id, f"Replaced product photo with media asset {asset.id}.")
    await db.commit()
    await db.refresh(image)
    return image


class ImageOrder(BaseModel):
    image_ids: list[int] = Field(max_length=6)


@router.put("/{product_id}/images")
async def reorder_images(product_id: int, order: ImageOrder, db: DB, owner: Owner):
    product = await locked_product(db, product_id)
    if len(order.image_ids) != len(set(order.image_ids)) or set(order.image_ids) != {i.id for i in product.images}:
        raise HTTPException(409, "The gallery changed. Reload it before reordering.")
    for item in product.images:
        item.position = order.image_ids.index(item.id)
    await log_change(db, owner, product_id, "Reordered product gallery and cover.")
    await db.commit()
    return {"message": "Gallery updated."}


@router.delete("/{product_id}/images/{image_id}", status_code=204)
async def remove_image(product_id: int, image_id: int, db: DB, owner: Owner):
    product = await locked_product(db, product_id)
    image = next((item for item in product.images if item.id == image_id), None)
    if image is None:
        raise HTTPException(404, "Product image not found.")
    if product.storefront_published and len(product.images) == 1:
        raise HTTPException(409, "Unpublish this product before removing its final photo.")
    await db.delete(image)
    product.image_file = None
    for index, item in enumerate(i for i in product.images if i.id != image_id):
        item.position = index
    await log_change(db, owner, product_id, "Removed product photo.")
    await db.commit()
