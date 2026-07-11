from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryBase(BaseModel):
    quantity: int = Field(default=0, ge=0)
    low_stock_threshold: int = Field(default=10, ge=0)


class InventoryCreate(InventoryBase):
    product_id: int


class InventoryUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=0)
    low_stock_threshold: int | None = Field(default=None, ge=0)


class InventoryPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    low_stock_threshold: int
    created_at: datetime
    updated_at: datetime