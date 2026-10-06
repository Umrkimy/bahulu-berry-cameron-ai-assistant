from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class EmailDelivery(Base):
    """One email to an admin, or one queued status email for a website order.

    Customer emails store the order rather than the address; the address is
    read from the order when the email is sent.
    """

    __tablename__ = "email_deliveries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipient_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id"), nullable=True, index=True)
    order_id: Mapped[int | None] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=True, index=True)
    email_type: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(180), unique=True, nullable=True)
    # SENT, FAILED or SKIPPED; customer status emails start as QUEUED.
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SENT", index=True)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    provider_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
