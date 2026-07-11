from datetime import datetime
from decimal import Decimal

from app.schemas.inventory import InventoryPublic

from pydantic import BaseModel, ConfigDict, Field


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    price: Decimal = Field(
        max_digits=10,
        decimal_places=2,
    )
    image_file: str | None 
    category: str | None = Field(default=None, max_length=50)
    is_active: bool = True


class ProductCreate(ProductBase):
    initial_quantity: int = Field(
        default=0,
        ge=0
    )


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
    inventory: InventoryPublic | None


class ProductPrivate(ProductPublic):
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    price: Decimal | None = Field(default=None, decimal_places=2, gt=0)
    image_file: str | None = None
    category: str | None = Field(default=None, max_length=50)
    is_active: bool | None = None