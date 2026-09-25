from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer)
    legacy: Mapped[bool] = mapped_column(Boolean, default=False)

    @property
    def image_path(self) -> str:
        return f"/api/products/{self.product_id}/images/{self.id}/content"


class StorefrontFeature(Base):
    __tablename__ = "storefront_feature"
    __table_args__ = (CheckConstraint("id = 1", name="single_storefront_feature"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
