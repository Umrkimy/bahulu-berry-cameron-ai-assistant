from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

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


class StorefrontCheckoutContact(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=9, max_length=20)
    email: EmailStr | None = None
    address: str = Field(min_length=5, max_length=255)
    city: str = Field(min_length=2, max_length=100)
    state: str = Field(min_length=2, max_length=100)
    postal_code: str = Field(pattern=r"^\d{5}$")

    @field_validator("full_name", "address", "city", "state", mode="before")
    @classmethod
    def strip_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("email", mode="before")
    @classmethod
    def blank_email_is_none(cls, value):
        if isinstance(value, str) and not value.strip():
            return None
        return value


class StorefrontCheckoutRequest(StorefrontQuoteRequest):
    contact: StorefrontCheckoutContact
    locale: Literal["en", "ms"] = "en"
    # The customer must tick the privacy notice before we store their details.
    privacy_notice_accepted: Literal[True]


class StorefrontCheckoutResponse(BaseModel):
    order_number: int
    total_amount: Decimal
    payment_url: str
    # Private link token for /orders/<token>; shown once, only its hash is kept.
    tracking_token: str


class StorefrontCheckoutStatus(BaseModel):
    enabled: bool
    test_mode: bool


class StorefrontOrderLookupRequest(BaseModel):
    order_number: int = Field(gt=0, lt=2_147_483_647)
    phone_number: str = Field(min_length=9, max_length=20)


class StorefrontTrackedItem(BaseModel):
    name_en: str
    name_ms: str
    quantity: int
    total_amount: Decimal


class StorefrontTrackedDelivery(BaseModel):
    status: str
    courier: str | None = None
    tracking_number: str | None = None
    shipped_at: datetime | None = None
    out_for_delivery_at: datetime | None = None
    delivered_at: datetime | None = None
    failed_at: datetime | None = None


class StorefrontTrackedOrder(BaseModel):
    """What a customer may see about their own order.

    Deliberately narrow: no address, email, full phone number, customer id,
    payment link or provider ids.
    """

    order_number: int
    created_at: datetime
    closed_at: datetime | None = None
    status: str
    payment_status: str
    items: list[StorefrontTrackedItem]
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    delivery: StorefrontTrackedDelivery | None = None
    recipient_first_name: str | None = None
    phone_last_digits: str | None = None
