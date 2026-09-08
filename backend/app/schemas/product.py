from datetime import datetime
from decimal import Decimal

from app.schemas.inventory import InventoryNested
from app.schemas.discount import DiscountSummary

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    price: Decimal = Field(
        max_digits=10,
        decimal_places=2,
    )
    image_file: str | None = None
    category: str | None = Field(default=None, max_length=50)
    is_active: bool = True


class ProductCreate(ProductBase):
    initial_quantity: int = Field(default=0, ge=0)


class ProductPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    price: Decimal = Field(
        max_digits=10,
        decimal_places=2,
    )
    image_path: str
    category: str | None
    inventory: InventoryNested | None
    active_discount: DiscountSummary | None = None
    active_discounts: list[DiscountSummary] = []


class ProductPrivate(ProductPublic):
    is_active: bool
    storefront_published: bool
    storefront_name_en: str | None
    storefront_name_ms: str | None
    storefront_description_en: str | None
    storefront_description_ms: str | None
    created_at: datetime
    updated_at: datetime


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    price: Decimal | None = Field(default=None, decimal_places=2, gt=0)
    image_file: str | None = None
    category: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None
    storefront_published: bool | None = None
    storefront_name_en: str | None = Field(default=None, max_length=100)
    storefront_name_ms: str | None = Field(default=None, max_length=100)
    storefront_description_en: str | None = None
    storefront_description_ms: str | None = None


class StorefrontPromotion(BaseModel):
    label: str
    discount_type: str
    discount_value: Decimal
    bundle_quantity: int | None = None


class StorefrontProduct(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name_en: str
    name_ms: str
    description_en: str | None
    description_ms: str | None
    category: str | None
    price: Decimal
    sale_price: Decimal | None
    image_path: str | None
    is_available: bool
    promotions: list[StorefrontPromotion]
