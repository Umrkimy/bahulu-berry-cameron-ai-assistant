from pydantic import BaseModel


class EmailConfigurationStatus(BaseModel):
    mode: str
    delivery_enabled: bool
    sender: str | None = None
    reset_link_expiry_minutes: int


class OwnerPasswordResetResponse(BaseModel):
    message: str
