from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal


class OrderItemBase(BaseModel):
    quantity: int = Field(default=1, ge=1)


class OrderItemCreate(OrderItemBase):
    product_id: int


class OrderItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=1)


class OrderItemPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
