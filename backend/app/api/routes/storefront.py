from decimal import Decimal, ROUND_HALF_UP
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.rate_limit import STOREFRONT_READ_LIMIT, rate_limiter
from app.db.database import get_db
from app.models.product import Product
from app.models.product_image import ProductImage, StorefrontFeature
from app.api.routes.product_images import image_response
from app.services.product_services import product_sale_price
from app.schemas.product import ProductImagePublic
from app.schemas.pagination import PaginatedResponse
from app.schemas.product import StorefrontProduct, StorefrontPromotion

router = APIRouter()
MONEY = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


def _promotion_label(discount) -> str:
    if discount.discount_type == "PERCENTAGE":
        return f"{_money(Decimal(str(discount.discount_value)))}% off"
    if discount.discount_type == "FIXED_AMOUNT":
        return f"RM {_money(Decimal(str(discount.discount_value)))} off"
    return f"Buy {discount.bundle_quantity} for RM {_money(Decimal(str(discount.discount_value)))}"


def _serialize_product(product: Product) -> StorefrontProduct:
    promotions = [
        StorefrontPromotion(
            label=_promotion_label(discount),
            discount_type=discount.discount_type,
            discount_value=discount.discount_value,
            bundle_quantity=discount.bundle_quantity,
        )
        for discount in product.active_discounts
    ]
    unit_price = _money(Decimal(str(product.price)))
    images = [ProductImagePublic(id=image.id, position=image.position,
        image_path=f"/api/storefront/products/{product.id}/images/{image.id}/content") for image in product.images]

    return StorefrontProduct(
        id=product.id,
        name_en=product.storefront_name_en or product.name,
        name_ms=product.storefront_name_ms or product.name,
        description_en=product.storefront_description_en,
        description_ms=product.storefront_description_ms,
        category=product.category,
        price=unit_price,
        sale_price=product_sale_price(product),
        image_path=images[0].image_path if images else None,
        images=images,
        is_available=bool(product.inventory and product.inventory.quantity > 0),
        promotions=promotions,
    )


def _published_filters():
    return (
        Product.is_active.is_(True),
        Product.storefront_published.is_(True),
        Product.storefront_name_en.is_not(None),
        Product.storefront_name_ms.is_not(None),
        func.trim(Product.storefront_name_en) != "",
        func.trim(Product.storefront_name_ms) != "",
    )


@router.get("/products", response_model=PaginatedResponse[StorefrontProduct])
async def list_storefront_products(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response: Response,
    search: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=50),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=48),
):
    await rate_limiter.check(request, "storefront-products", STOREFRONT_READ_LIMIT)
    response.headers["Cache-Control"] = "no-store"
    filters = list(_published_filters())
    if search:
        filters.append(
            func.lower(Product.storefront_name_en).contains(search.lower())
            | func.lower(Product.storefront_name_ms).contains(search.lower())
        )
    if category:
        filters.append(Product.category == category)

    total = await db.scalar(select(func.count()).select_from(Product).where(*filters)) or 0
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory), selectinload(Product.discounts))
        .where(*filters)
        .order_by(Product.storefront_name_en.asc(), Product.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return PaginatedResponse.create(
        items=[_serialize_product(product) for product in result.scalars().all()],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/products/{product_id}", response_model=StorefrontProduct)
async def get_storefront_product(
    product_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    response: Response,
):
    await rate_limiter.check(request, "storefront-product", STOREFRONT_READ_LIMIT)
    response.headers["Cache-Control"] = "no-store"
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory), selectinload(Product.discounts))
        .where(Product.id == product_id, *_published_filters())
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product is not available.")
    return _serialize_product(product)


@router.get("/featured", response_model=StorefrontProduct | None)
async def featured_product(db: Annotated[AsyncSession, Depends(get_db)], response: Response):
    response.headers["Cache-Control"] = "no-store"
    product = await db.scalar(select(Product).join(StorefrontFeature, StorefrontFeature.product_id == Product.id).where(StorefrontFeature.id == 1, *_published_filters()))
    return _serialize_product(product) if product and product.images else None


@router.get("/products/{product_id}/images/{image_id}/content")
async def public_image(product_id: int, image_id: int, db: Annotated[AsyncSession, Depends(get_db)]):
    image = await db.scalar(select(ProductImage).join(Product, Product.id == ProductImage.product_id).where(ProductImage.id == image_id, Product.id == product_id, *_published_filters()))
    if image is None:
        raise HTTPException(404, "Product image not found.")
    return image_response(image)
