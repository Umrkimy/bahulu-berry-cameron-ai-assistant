from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ActivityPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: int | None
    action: str
    entity_type: str
    entity_id: int | None
    description: str
    metadata_json: dict[str, Any] | None
    created_at: datetime
