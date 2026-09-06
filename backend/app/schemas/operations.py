from datetime import datetime
from typing import Literal

from pydantic import BaseModel


AlertCategory = Literal["INVENTORY", "ORDER", "SUPPORT", "REFUND"]
AlertSeverity = Literal["CRITICAL", "WARNING"]


class OperationAlert(BaseModel):
    id: str
    category: AlertCategory
    severity: AlertSeverity
    title: str
    description: str
    source_at: datetime
    href: str


class OperationAlertCounts(BaseModel):
    total: int
    critical: int
    warning: int


class OperationAlertPage(BaseModel):
    items: list[OperationAlert]
    total: int
    limit: int
    offset: int
    counts: OperationAlertCounts
