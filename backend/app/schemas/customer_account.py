from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

from app.schemas.storefront import StorefrontTrackedOrder

Locale = Literal["en", "ms"]


class CodeRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    locale: Locale = "en"


class CodeRequestResponse(BaseModel):
    message: str
    # Local development with the console email provider only; never set elsewhere.
    demo_code: str | None = None


class CodeVerifyRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    code: str = Field(pattern=r"^\s*\d{6}\s*$")
    locale: Locale = "en"


class PasswordSignInRequest(BaseModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=1, max_length=128)


class SetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)
    current_password: str | None = Field(default=None, max_length=128)


class AccountProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, max_length=120)
    phone_number: str | None = Field(default=None, max_length=20)
    locale: Locale | None = None


class DeleteAccountRequest(BaseModel):
    confirm_email: EmailStr


class CustomerAccountView(BaseModel):
    email: str
    full_name: str | None
    phone_number: str | None
    locale: str
    has_password: bool
    created_at: datetime


class SessionResponse(BaseModel):
    """Returned to the storefront server only; it keeps the token in an HttpOnly cookie."""

    account: CustomerAccountView
    session_token: str
    expires_at: datetime


class AccountOrders(BaseModel):
    orders: list[StorefrontTrackedOrder]
