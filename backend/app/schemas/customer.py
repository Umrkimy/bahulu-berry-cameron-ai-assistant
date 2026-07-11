from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CustomerBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone_number: str = Field(min_length=10, max_length=20)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str = Field(default="Malaysia", max_length=100)


class CustomerCreate(CustomerBase):
    pass


class CustomerPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    city: str | None
    state: str | None
    country: str
    created_at: datetime


class CustomerPrivate(CustomerPublic):
    phone_number: str
    email: EmailStr | None
    address: str | None
    postal_code: str | None


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(
        default=None,
        min_length=1,
        max_length=120,
    )
    phone_number: str | None = Field(
        default=None,
        min_length=10,
        max_length=20,
    )
    email: EmailStr | None = None
    address: str | None = Field(
        default=None,
        max_length=255,
    )
    city: str | None = Field(
        default=None,
        max_length=100,
    )
    state: str | None = Field(
        default=None,
        max_length=100,
    )
    postal_code: str | None = Field(
        default=None,
        max_length=20,
    )
    country: str | None = Field(
        default=None,
        max_length=100,
    )
