from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.constants.order import ORDER_STATUS, PAYMENT_STATUS
from app.schemas.order_item import OrderItemCreate


class OrderBase(BaseModel):
    status: Literal[*ORDER_STATUS] = "PENDING"
    payment_status: Literal[*PAYMENT_STATUS] = "UNPAID"


class OrderCreate(OrderBase):
    customer_id: int

    items: list[OrderItemCreate] = Field(
        min_length=1,
    )

    delivery_name: str | None = None
    delivery_phone: str | None = None
    delivery_address: str | None = None

    city: str | None = None
    state: str | None = None
    postal_code: str | None = None

    country: str = "Malaysia"


class OrderUpdate(BaseModel):
    status: Literal[*ORDER_STATUS] | None = None
    payment_status: Literal[*PAYMENT_STATUS] | None = None

    delivery_name: str | None = None
    delivery_phone: str | None = None
    delivery_address: str | None = None

    city: str | None = None
    state: str | None = None
    postal_code: str | None = None

    country: str | None = None

    tracking_number: str | None = None


class OrderPrivate(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    customer_id: int

    status: str
    payment_status: str

    total_amount: Decimal

    delivery_name: str | None
    delivery_phone: str | None
    delivery_address: str | None

    city: str | None
    state: str | None
    postal_code: str | None
    country: str

    tracking_number: str | None

    shipped_at: datetime | None
    completed_at: datetime | None

    created_at: datetime
    updated_at: datetime