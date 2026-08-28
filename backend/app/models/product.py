from __future__ import annotations
from typing import TYPE_CHECKING

from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy import DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

if TYPE_CHECKING:
    from app.models.discount import Discount
    from app.models.order_item import OrderItem
    from app.models.inventory import Inventory


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    image_file: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
        default=None,
    )
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    @property
    def image_path(self) -> str:
        if self.image_file:
            return f"/static/product_images/{self.image_file}"

        return "/static/product_images/default.jpg"

    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product")
    inventory: Mapped["Inventory"] = relationship(
        back_populates="product", uselist=False, lazy="selectin"
    )
    discounts: Mapped[list["Discount"]] = relationship(
        back_populates="product",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    @property
    def active_discounts(self):
        now = datetime.now(UTC)

        return [
            discount
            for discount in self.discounts
            if discount.is_active
            and (discount.start_at.replace(tzinfo=UTC) if discount.start_at.tzinfo is None else discount.start_at) <= now
            and now < (discount.end_at.replace(tzinfo=UTC) if discount.end_at.tzinfo is None else discount.end_at)
        ]

    @property
    def active_discount(self):
        for discount in self.active_discounts:
            return discount
        return None
