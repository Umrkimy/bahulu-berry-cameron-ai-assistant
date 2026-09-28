from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

DRAFT_STATUSES = ("PENDING_REVIEW", "APPROVED", "EDITED_APPROVED", "REJECTED", "SUPERSEDED")


class SupportDraft(Base):
    """An AI reply draft waiting for, or past, human review. Never sent automatically."""

    __tablename__ = "support_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int | None] = mapped_column(ForeignKey("messaging_conversations.id", ondelete="SET NULL"), nullable=True, index=True)
    messaging_event_id: Mapped[int | None] = mapped_column(ForeignKey("messaging_events.id", ondelete="SET NULL"), nullable=True, unique=True)
    support_request_id: Mapped[int | None] = mapped_column(ForeignKey("support_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(5), nullable=False)
    customer_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    edited_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_ids: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False, default=list)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING_REVIEW", index=True)
    reviewed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
