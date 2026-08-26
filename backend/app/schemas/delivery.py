from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.constants.delivery import DELIVERY_STATUS


class DeliveryCreate(BaseModel):
    recipient_name: str | None = None
    recipient_phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str = "Malaysia"
    courier: str | None = None
    tracking_number: str | None = None


class DeliveryUpdate(BaseModel):
    recipient_name: str | None = None
    recipient_phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    country: str | None = None
    courier: str | None = None
    tracking_number: str | None = None
    status: Literal[*DELIVERY_STATUS] | None = None


class DeliveryPrivate(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    order_id: int

    recipient_name: str | None
    recipient_phone: str | None
    address: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str

    courier: str | None
    tracking_number: str | None
    status: str

    shipped_at: datetime | None
    out_for_delivery_at: datetime | None
    delivered_at: datetime | None
    failed_at: datetime | None

    created_at: datetime
    updated_at: datetime