from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AIUsagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: int | None
    source: str
    model: str
    input_tokens: int
    output_tokens: int
    estimated_cost_usd: float
    outcome: str
    created_at: datetime


class AIUsageByAdmin(BaseModel):
    admin_id: int | None
    username: str
    estimated_cost_usd: float


class AIUsageDaily(BaseModel):
    date: str
    estimated_cost_usd: float


class AIUsageSummary(BaseModel):
    budget_usd: float
    budget_rm_display: float
    spent_usd: float
    spent_rm_display: float
    remaining_usd: float
    percent_used: float
    warning_threshold_percent: float
    warning: bool
    month_start: datetime
    by_admin: list[AIUsageByAdmin]
    daily: list[AIUsageDaily]
