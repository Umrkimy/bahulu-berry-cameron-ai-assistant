from datetime import datetime

from pydantic import BaseModel


class StaffRatingSummary(BaseModel):
    admin_id: int
    username: str
    role: str
    ratings: int
    average: float | None
    low: int


class SupportRatingPublic(BaseModel):
    id: int
    admin_id: int
    username: str
    score: int
    comment: str | None
    flagged: bool
    rated_at: datetime
    support_request_id: int | None
