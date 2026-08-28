from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.constants.payment import PAYMENT_STATUS


class PaymentCreate(BaseModel):
    order_id: int


class PaymentResponse(BaseModel):
    id: int
    order_id: int
    provider: str
    provider_payment_id: str | None
    amount: Decimal
    currency: str
    status: str
    payment_url: str | None
    paid_at: datetime | None
    provider_refund_id: str | None
    refund_reason: str | None
    refunded_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
