from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


RefundRequestStatus = Literal["REQUESTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "REFUNDED"]


class RefundRequestCreate(BaseModel):
    order_id: int
    reason: str = Field(min_length=3, max_length=500)


class RefundRequestUpdate(BaseModel):
    status: RefundRequestStatus
    internal_note: str | None = Field(default=None, max_length=500)


class RefundRequestPublic(BaseModel):
    id: int
    order_id: int
    customer_name: str
    order_total: Decimal
    status: RefundRequestStatus
    reason: str
    internal_note: str | None
    requested_by_admin_id: int
    reviewed_by_admin_id: int | None
    created_at: datetime
    reviewed_at: datetime | None
    refunded_at: datetime | None
    updated_at: datetime
