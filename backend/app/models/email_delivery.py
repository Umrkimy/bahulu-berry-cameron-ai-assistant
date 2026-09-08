from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class EmailDelivery(Base):
    __tablename__ = "email_deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipient_admin_id: Mapped[int] = mapped_column(ForeignKey("admins.id"), nullable=False, index=True)
    email_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(180), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SENT", index=True)
    provider_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
