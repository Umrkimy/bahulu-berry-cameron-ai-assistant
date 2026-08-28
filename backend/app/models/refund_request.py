from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.admin import Admin
    from app.models.order import Order


class RefundRequest(Base):
    __tablename__ = "refund_requests"
    __table_args__ = (UniqueConstraint("order_id", name="uq_refund_requests_order_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False, index=True)
    requested_by_admin_id: Mapped[int] = mapped_column(ForeignKey("admins.id"), nullable=False, index=True)
    reviewed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="REQUESTED", nullable=False, index=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)

    order: Mapped["Order"] = relationship()
    requested_by_admin: Mapped["Admin"] = relationship(foreign_keys=[requested_by_admin_id])
    reviewed_by_admin: Mapped["Admin | None"] = relationship(foreign_keys=[reviewed_by_admin_id])
