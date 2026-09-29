from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

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
    from app.models.payment import Payment
    from app.models.delivery import Delivery
    


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

    status: Mapped[str] = mapped_column(
        String(50),
        default="PENDING",
        nullable=False,
    )

    payment_status: Mapped[str] = mapped_column(
        String(50),
        default="UNPAID",
        nullable=False,
    )

    # ADMIN orders are entered by staff; STOREFRONT orders come from website
    # checkout and are auto-cancelled if left unpaid.
    source: Mapped[str] = mapped_column(
        String(20),
        default="ADMIN",
        server_default="ADMIN",
        nullable=False,
        index=True,
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # When the order became COMPLETED or CANCELLED; tracking links expire
    # a fixed time after this.
    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # SHA-256 of the customer's private tracking token. The token itself is
    # returned once at checkout and never stored.
    tracking_token_hash: Mapped[str | None] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=True,
    )

    customer: Mapped["Customer"] = relationship(
        back_populates="orders",
    )

    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan",
    )

    payments: Mapped[list["Payment"]] = relationship(
    back_populates="order",
    cascade="all, delete-orphan",
    )

    delivery: Mapped["Delivery | None"] = relationship(
        back_populates="order",
        uselist=False,
        cascade="all, delete-orphan",
    )

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        default=Decimal("0.00"),
        nullable=False,
    )
