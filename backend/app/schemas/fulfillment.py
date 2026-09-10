from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class FulfillmentDelivery(BaseModel):
    id: int
    status: str
    recipient_name: str | None
    recipient_phone: str | None
    address: str | None
    city: str | None
    state: str | None
    postal_code: str | None
    country: str
    courier: str | None
    tracking_number: str | None
    updated_at: datetime


class FulfillmentItem(BaseModel):
    id: int
    product_name: str
    quantity: int


class FulfillmentOrder(BaseModel):
    id: int
    customer_name: str
    status: str
    payment_status: str
    total_amount: Decimal
    created_at: datetime
    queue_stage: Literal["NEEDS_ATTENTION", "READY_TO_PREPARE", "IN_PREPARATION", "IN_DELIVERY"]
    items: list[FulfillmentItem]
    delivery: FulfillmentDelivery | None


class FulfillmentQueueResponse(BaseModel):
    items: list[FulfillmentOrder]
    counts: dict[str, int]
