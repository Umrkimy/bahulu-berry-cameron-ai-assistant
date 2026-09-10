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
    product_name: str
    product_category: str | None
    quantity: int
    low_stock_threshold: int
    created_at: datetime
    updated_at: datetime

class InventoryNested(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    quantity: int
    low_stock_threshold: int

class InventoryAdjustment(BaseModel):
    quantity_change: int
    reason: str | None = Field(default=None, max_length=2000)


class StockMovementCreate(BaseModel):
    low_stock_threshold: int | None = Field(default=None, ge=0)
    movement_type: str = Field(pattern="^(SUPPLIER_RECEIPT|MANUAL_INCREASE|MANUAL_DECREASE)$")
    quantity_change: int
    reason: str | None = Field(default=None, max_length=2_000)
    supplier_id: int | None = None
    reference: str | None = Field(default=None, max_length=160)


class BatchStockReceiptLine(BaseModel):
    inventory_id: int = Field(gt=0)
    quantity: int = Field(ge=1)


class BatchStockReceiptCreate(BaseModel):
    supplier_id: int = Field(gt=0)
    reference: str = Field(min_length=2, max_length=160)
    items: list[BatchStockReceiptLine] = Field(min_length=1, max_length=50)


class BatchStockReceiptResult(BaseModel):
    received_count: int
    inventories: list[InventoryPublic]


class OpeningBalanceCreate(BaseModel):
    reason: str = Field(min_length=2, max_length=2_000)


class StockMovementPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    inventory_id: int
    product_id: int
    product_name: str
    supplier_id: int | None
    supplier_name: str | None
    admin_name: str | None
    movement_type: str
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reason: str | None
    reference: str | None
    source_type: str | None
    source_id: int | None
    created_at: datetime
