from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MediaAssetUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    title: str = Field(min_length=1, max_length=120)
    note: str | None = Field(default=None, max_length=1000)

    @field_validator("note")
    @classmethod
    def empty_note_is_none(cls, value: str | None):
        return value or None


class MediaUsage(BaseModel):
    product_id: int
    product_name: str
    placement_id: int
    position: int


class MediaAssetPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    note: str | None
    mime_type: str | None
    width: int | None
    height: int | None
    byte_size: int | None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    usage_count: int = 0
    usages: list[MediaUsage] = []
    content_path: str
    was_reused: bool = False


class MediaAssetPage(BaseModel):
    items: list[MediaAssetPublic]
    page: int
    page_size: int
    total: int
    pages: int


class MediaAttachment(BaseModel):
    asset_id: int
