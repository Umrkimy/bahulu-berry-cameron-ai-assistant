from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
class TaskInput(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    priority: str = Field(default="NORMAL", pattern="^(LOW|NORMAL|HIGH)$")
    due_at: datetime | None = None
    assigned_admin_id: int | None = None
    context_type: str | None = Field(default=None, pattern="^(ORDER|DELIVERY|INVENTORY)$")
    context_id: int | None = Field(default=None, ge=1)
class TaskUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(OPEN|IN_PROGRESS|COMPLETED)$")
    description: str | None = Field(default=None, max_length=2000)
    priority: str | None = Field(default=None, pattern="^(LOW|NORMAL|HIGH)$")
    due_at: datetime | None = None
    assigned_admin_id: int | None = None
    context_type: str | None = Field(default=None, pattern="^(ORDER|DELIVERY|INVENTORY)$")
    context_id: int | None = Field(default=None, ge=1)
    completion_note: str | None = Field(default=None, min_length=1, max_length=2_000)
class TaskPublic(TaskInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    status: str
    created_by_admin_id: int
    created_at: datetime
    updated_at: datetime
    context_label: str | None
    completion_note: str | None
    completed_at: datetime | None
