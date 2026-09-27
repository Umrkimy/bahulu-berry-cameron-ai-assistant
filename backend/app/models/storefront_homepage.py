from datetime import UTC, datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class StorefrontHomepage(Base):
    __tablename__ = "storefront_homepage"
    __table_args__ = (CheckConstraint("id = 1", name="single_storefront_homepage"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    draft_content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    published_content: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    draft_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    published_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    updated_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    published_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admins.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC), nullable=False)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
