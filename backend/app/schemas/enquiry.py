from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.task import TaskPublic


class EnquiryInput(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    notes: str = Field(min_length=2, max_length=4_000)
    source: str = Field(default="OTHER", pattern="^(WHATSAPP|CALL|WALK_IN|SOCIAL|OTHER)$")
    contact_name: str | None = Field(default=None, max_length=120)
    reply_contact: str | None = Field(default=None, max_length=255)


class EnquiryStatusUpdate(BaseModel):
    status: str = Field(pattern="^(WORKING|RESOLVED|SPAM)$")


class EnquiryTaskInput(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    instructions: str = Field(min_length=2, max_length=2_000)
    priority: str = Field(default="NORMAL", pattern="^(LOW|NORMAL|HIGH)$")
    due_at: datetime | None = None
    assigned_admin_id: int | None = None


class EnquiryPublic(EnquiryInput):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: str
    created_by_admin_id: int
    status_updated_by_admin_id: int | None
    status_updated_at: datetime | None
    task_id: int | None
    task: TaskPublic | None = None
    created_at: datetime
    updated_at: datetime
