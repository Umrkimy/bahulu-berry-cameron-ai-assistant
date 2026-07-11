from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import UTC, datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.order_item import OrderItem


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id"),
        nullable=False,
        index=True,
    )

    # ORDER STATUS
    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING",
    )

    # PAYMENT STATUS
    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="UNPAID",
    )

    total_amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
    )

    # ==========================
    # DELIVERY INFORMATION
    # ==========================

    delivery_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    delivery_phone: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    delivery_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    city: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    state: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    postal_code: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    country: Mapped[str] = mapped_column(
        String(50),
        default="Malaysia",
    )

    tracking_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    customer: Mapped["Customer"] = relationship(back_populates="orders")

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )
