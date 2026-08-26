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


class OrderUpdate(BaseModel):
    status: Literal[*ORDER_STATUS] | None = None
    payment_status: Literal[*PAYMENT_STATUS] | None = None


class OrderPrivate(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int

    customer_id: int

    status: str
    payment_status: str

    total_amount: Decimal

    created_at: datetime
    updated_at: datetime