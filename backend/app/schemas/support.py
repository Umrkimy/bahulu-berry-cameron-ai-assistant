from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class FAQInput(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    question_en: str = Field(min_length=2, max_length=2000)
    answer_en: str = Field(min_length=2, max_length=5000)
    question_ms: str | None = Field(default=None, max_length=2000)
    answer_ms: str | None = Field(default=None, max_length=5000)
    is_active: bool = True
class FAQPublic(FAQInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime
class TemplateInput(BaseModel):
    category: str = Field(min_length=2, max_length=80)
    name: str = Field(min_length=2, max_length=120)
    content_en: str = Field(min_length=2, max_length=5000)
    content_ms: str | None = Field(default=None, max_length=5000)
    is_active: bool = True
class TemplatePublic(TemplateInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime
class RuleInput(BaseModel):
    trigger: str = Field(min_length=2, max_length=120)
    description: str = Field(min_length=2, max_length=1000)
    is_active: bool = True
class RulePublic(RuleInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    updated_at: datetime
class SupportRequestInput(BaseModel):
    customer_id: int | None = None
    customer_name: str = Field(min_length=2, max_length=160)
    contact: str | None = Field(default=None, max_length=160)
    source: str = "MANUAL"
    subject: str = Field(min_length=2, max_length=200)
    notes: str | None = Field(default=None, max_length=5000)
    handoff_reason: str | None = Field(default=None, max_length=120)
    priority: str = "NORMAL"
    status: str = "NEW"
    assigned_admin_id: int | None = None
class SupportRequestPublic(SupportRequestInput):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
