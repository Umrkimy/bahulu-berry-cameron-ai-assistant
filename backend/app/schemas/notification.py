from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.pagination import PaginatedResponse


class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    notification_type: str
    title: str
    description: str
    route: str
    entity_type: str | None
    entity_id: int | None
    read_at: datetime | None
    created_at: datetime


class NotificationUnreadCount(BaseModel):
    unread_count: int


NotificationPage = PaginatedResponse[NotificationPublic]
