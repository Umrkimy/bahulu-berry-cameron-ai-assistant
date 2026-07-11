from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AdminBase(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr


class AdminCreate(AdminBase):
    password: str = Field(
        min_length=8,
        max_length=128
    )

    is_superuser: bool = False


class AdminLogin(BaseModel):
    email: EmailStr
    password: str


class AdminUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=50)
    email: EmailStr | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class AdminPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr


class AdminPrivate(AdminPublic):
    is_superuser: bool
    created_at: datetime
    updated_at: datetime