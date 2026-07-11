from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OrderBase(BaseModel):

    status: str = Field(
        default="PENDING",
        max_length=50,
    )

    payment_status: str = Field(
        default="UNPAID",
        max_length=50,
    )

class OrderCreate(OrderBase):

    customer_id: int

class OrderUpdate(BaseModel):

    status: str | None = None
    payment_status: str | None = None
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
        from_attributes=True
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