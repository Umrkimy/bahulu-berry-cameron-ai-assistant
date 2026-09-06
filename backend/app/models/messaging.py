from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class MessagingConversation(Base):
    __tablename__ = "messaging_conversations"
    __table_args__ = (UniqueConstraint("provider", "external_conversation_id", name="uq_messaging_conversation_provider_external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    external_conversation_id: Mapped[str] = mapped_column(String(160), nullable=False)
    support_request_id: Mapped[int | None] = mapped_column(ForeignKey("support_requests.id"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)


class MessagingEvent(Base):
    __tablename__ = "messaging_events"
    __table_args__ = (UniqueConstraint("provider", "external_message_id", name="uq_messaging_event_provider_external_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    external_message_id: Mapped[str] = mapped_column(String(160), nullable=False)
    conversation_id: Mapped[int] = mapped_column(ForeignKey("messaging_conversations.id"), nullable=False, index=True)
    support_request_id: Mapped[int | None] = mapped_column(ForeignKey("support_requests.id"), nullable=True, index=True)
    direction: Mapped[str] = mapped_column(String(20), default="INBOUND", nullable=False)
    outcome: Mapped[str] = mapped_column(String(30), nullable=False)
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False, index=True)
