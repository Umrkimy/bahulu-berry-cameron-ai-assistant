from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    assigned_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    created_by_admin_id: Mapped[int] = mapped_column(ForeignKey("admins.id"), nullable=False)
    context_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    context_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    context_label: Mapped[str | None] = mapped_column(String(200), nullable=True)
    completion_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)
