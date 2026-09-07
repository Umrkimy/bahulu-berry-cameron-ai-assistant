from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class SupplierInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    contact_name: str | None = Field(default=None, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    email: str | None = Field(default=None, max_length=255)
    note: str | None = Field(default=None, max_length=2_000)
    is_active: bool = True


class SupplierPublic(SupplierInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
