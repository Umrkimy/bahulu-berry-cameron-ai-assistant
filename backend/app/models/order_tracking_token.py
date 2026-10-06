from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class OrderTrackingToken(Base):
    """SHA-256 of one private tracking link for a website order.

    The token itself is shown once (on the checkout success page or in a
    status email) and never stored. An order collects one row per link, and
    every link keeps working until tracking expires for the order.
    """

    __tablename__ = "order_tracking_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
