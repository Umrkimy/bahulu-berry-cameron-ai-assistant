from datetime import UTC, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_serializer, model_validator

from app.constants.discount import DISCOUNT_TYPES


class DiscountBase(BaseModel):
    product_id: int
    name: str = Field(min_length=1, max_length=100)
    discount_type: Literal[*DISCOUNT_TYPES]
    discount_value: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    bundle_quantity: int | None = Field(default=None, ge=2)
    stack_with_bundle: bool = False
    start_at: datetime
    end_at: datetime
    is_active: bool = True

    @model_validator(mode="after")
    def validate_discount(self):
        if self.end_at <= self.start_at:
            raise ValueError("End time must be after start time.")

        if self.discount_type == "PERCENTAGE" and self.discount_value > 100:
            raise ValueError("Percentage discount cannot exceed 100.")

        if self.discount_type == "BUNDLE_PRICE" and self.bundle_quantity is None:
            raise ValueError("Bundle quantity is required for bundle pricing.")

        return self


class DiscountCreate(DiscountBase):
    pass


class DiscountUpdate(BaseModel):
    product_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=100)
    discount_type: Literal[*DISCOUNT_TYPES] | None = None
    discount_value: Decimal | None = Field(
        default=None,
        gt=0,
        max_digits=10,
        decimal_places=2,
    )
    bundle_quantity: int | None = Field(default=None, ge=2)
    stack_with_bundle: bool | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    is_active: bool | None = None


class DiscountSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    discount_type: str
    discount_value: Decimal
    bundle_quantity: int | None
    stack_with_bundle: bool
    start_at: datetime
    end_at: datetime

    @field_serializer("start_at", "end_at")
    def serialize_datetime(self, value: datetime) -> str:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


class DiscountPublic(DiscountSummary):
    product_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
