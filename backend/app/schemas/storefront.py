from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.schemas.product import StorefrontPromotion


class StorefrontQuoteRequestItem(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(ge=1, le=99)


class StorefrontQuoteRequest(BaseModel):
    items: list[StorefrontQuoteRequestItem] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def reject_duplicate_products(self):
        product_ids = [item.product_id for item in self.items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Each product may appear only once.")
        return self


class StorefrontQuoteLine(BaseModel):
    product_id: int
    quantity: int
    status: Literal["READY", "NOT_AVAILABLE", "QUANTITY_UNAVAILABLE"]
    name_en: str | None = None
    name_ms: str | None = None
    image_path: str | None = None
    unit_price: Decimal | None = None
    display_price: Decimal | None = None
    subtotal: Decimal | None = None
    discount_amount: Decimal | None = None
    total_amount: Decimal | None = None
    promotions: list[StorefrontPromotion] = Field(default_factory=list)


class StorefrontQuoteResponse(BaseModel):
    ready: bool
    items: list[StorefrontQuoteLine]
    subtotal: Decimal | None = None
    discount_amount: Decimal | None = None
    total_amount: Decimal | None = None
