from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.product import Product
from app.models.product_image import ProductImage, StorefrontFeature
from app.schemas.product import ProductImagePublic
from app.services.activity_services import record_activity
from app.services.product_media import MAX_UPLOAD, media_path, save_image

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


@router.get("/{product_id}/images", response_model=list[ProductImagePublic])
async def list_images(product_id: int, db: DB, _: Reader):
    product = await db.get(Product, product_id)
    if product is None:
        raise HTTPException(404, "Product not found.")
    return product.images


def image_response(image):
    path = media_path(image.filename, image.legacy)
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
    filename = await run_in_threadpool(save_image, data)
    try:
        if image is None:
            image = ProductImage(product_id=product_id, filename=filename, position=len(product.images), legacy=False)
            db.add(image)
        else:
            image.filename, image.legacy = filename, False
        await log_change(db, owner, product_id, "Updated product gallery.")
        await db.commit()
    except Exception:
        await db.rollback()
        media_path(filename).unlink(missing_ok=True)
        raise
    # Old files remain for backup recovery; they are no longer addressable via API.
    return image


@router.post("/{product_id}/images", response_model=ProductImagePublic, status_code=201)
async def upload_image(product_id: int, file: Annotated[UploadFile, File()], db: DB, owner: Owner):
    return await write_image(product_id, None, file, db, owner)


@router.put("/{product_id}/images/{image_id}", response_model=ProductImagePublic)
async def replace_image(product_id: int, image_id: int, file: Annotated[UploadFile, File()], db: DB, owner: Owner):
    return await write_image(product_id, image_id, file, db, owner)


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


@router.put("/{product_id}/feature")
async def feature_product(product_id: int, db: DB, owner: Owner):
    # Singleton row is seeded by the migration. Its lock serialises selections.
    feature = await db.scalar(select(StorefrontFeature).where(StorefrontFeature.id == 1).with_for_update())
    if feature is None:
        raise HTTPException(503, "Apply the product gallery migration first.")
    product = await locked_product(db, product_id)
    if not (product.is_active and product.storefront_published and product.name and product.name_ms and product.images):
        raise HTTPException(422, "Publish an active product with bilingual names and a cover photo first.")
    if not media_path(product.images[0].filename, product.images[0].legacy).is_file():
        raise HTTPException(422, "Upload a working cover photo first.")
    feature.product_id = product_id
    await log_change(db, owner, product_id, "Selected product for homepage.")
    await db.commit()
    return {"product_id": product_id}
