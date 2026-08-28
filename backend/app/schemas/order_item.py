from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderItemBase(BaseModel):
    quantity: int = Field(
        default=1,
        ge=1,
    )


class OrderItemCreate(OrderItemBase):
    product_id: int


class OrderItemUpdate(BaseModel):
    quantity: int | None = Field(
        default=None,
        ge=1,
    )


class OrderItemPublic(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    order_id: int
    product_id: int
    quantity: int
    unit_price: Decimal
    subtotal: Decimal
    discount_id: int | None
    discount_name: str | None
    discount_type: str | None
    discount_value: Decimal | None
    discount_bundle_quantity: int | None
    discount_amount: Decimal
    total_amount: Decimal
