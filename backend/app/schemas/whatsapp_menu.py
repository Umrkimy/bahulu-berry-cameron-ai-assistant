from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.whatsapp_menu import PLACEHOLDER, REQUIRED_PLACEHOLDERS, TEXT_PLACEHOLDERS

MAX_MESSAGE_LENGTH = 1000
MAX_STATUS_LENGTH = 60


def placeholder_issue(key: str, text: str) -> str | None:
    allowed = TEXT_PLACEHOLDERS[key]
    used = PLACEHOLDER.findall(text)
    unknown = sorted({name for name in used if name not in allowed})
    if unknown:
        return f"Remove {', '.join('{' + name + '}' for name in unknown)}; this message can only use {', '.join('{' + name + '}' for name in allowed) or 'no placeholders'}."
    if "{" in PLACEHOLDER.sub("", text) or "}" in PLACEHOLDER.sub("", text):
        return "Curly brackets can only be used for the placeholders listed."
    missing = [name for name in REQUIRED_PLACEHOLDERS.get(key, ()) if name not in used]
    if missing:
        return f"Keep {', '.join('{' + name + '}' for name in missing)} in this message."
    return None


class MenuStatuses(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    PENDING: str = Field(min_length=1, max_length=MAX_STATUS_LENGTH)
    PROCESSING: str = Field(min_length=1, max_length=MAX_STATUS_LENGTH)
    SHIPPED: str = Field(min_length=1, max_length=MAX_STATUS_LENGTH)
    COMPLETED: str = Field(min_length=1, max_length=MAX_STATUS_LENGTH)
    CANCELLED: str = Field(min_length=1, max_length=MAX_STATUS_LENGTH)

    @model_validator(mode="after")
    def no_brackets(self):
        for key, value in self.model_dump().items():
            if "{" in value or "}" in value:
                raise ValueError(f"{key}: curly brackets are not allowed in order status labels.")
        return self


class MenuLanguageCopy(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    menu: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    back: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    products: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    sold_out: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    no_products: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    browse: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    order: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    ask_order: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    order_status: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    order_not_found: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    hours: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    handoff: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    rating_ask: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    rating_thanks: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    comment_thanks: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    statuses: MenuStatuses

    @model_validator(mode="after")
    def valid_placeholders(self):
        for key in TEXT_PLACEHOLDERS:
            issue = placeholder_issue(key, getattr(self, key))
            if issue:
                raise ValueError(f"{key}: {issue}")
        return self


class MenuCopy(BaseModel):
    model_config = ConfigDict(extra="forbid")

    EN: MenuLanguageCopy
    MS: MenuLanguageCopy


class MenuCopyUpdate(BaseModel):
    expected_version: int = Field(ge=1)
    copy_text: MenuCopy = Field(alias="copy")

    model_config = ConfigDict(populate_by_name=True)


class MenuCopyResponse(BaseModel):
    defaults: MenuCopy
    current: MenuCopy
    placeholders: dict[str, list[str]]
    version: int
    updated_at: datetime | None
