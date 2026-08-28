from datetime import UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.discount import Discount
from app.models.product import Product
from app.schemas.discount import DiscountCreate, DiscountUpdate


def _as_utc(value):
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


async def _validate_discount(
    db: AsyncSession,
    product_id: int,
    discount_type: str,
    discount_value,
    bundle_quantity,
    start_at,
    end_at,
    is_active: bool,
    discount_id: int | None = None,
):
    if end_at <= start_at:
        raise ValueError("End time must be after start time.")

    if discount_type == "PERCENTAGE" and discount_value > 100:
        raise ValueError("Percentage discount cannot exceed 100.")

    if discount_type == "BUNDLE_PRICE" and bundle_quantity is None:
        raise ValueError("Bundle quantity is required for bundle pricing.")

    product = await db.get(Product, product_id)

    if product is None:
        raise ValueError("Product not found.")

    if not is_active:
        return

    query = select(Discount).where(
        Discount.product_id == product_id,
        Discount.is_active.is_(True),
        Discount.start_at < end_at,
        Discount.end_at > start_at,
    )

    if discount_id is not None:
        query = query.where(Discount.id != discount_id)

    overlapping_discounts = list((await db.execute(query)).scalars().all())

    if not overlapping_discounts:
        return

    allowed_pair = {"BUNDLE_PRICE", "PERCENTAGE"}
    existing_types = {item.discount_type for item in overlapping_discounts}

    if (
        discount_type in allowed_pair
        and existing_types.issubset(allowed_pair)
        and discount_type not in existing_types
    ):
        return

    raise ValueError(
        "Only one active promotion is allowed per product, except that one "
        "bundle-price promotion may run together with one percentage promotion."
    )


async def create_discount(db: AsyncSession, discount_data: DiscountCreate) -> Discount:
    await _validate_discount(
        db,
        discount_data.product_id,
        discount_data.discount_type,
        discount_data.discount_value,
        discount_data.bundle_quantity,
        _as_utc(discount_data.start_at),
        _as_utc(discount_data.end_at),
        discount_data.is_active,
    )

    values = discount_data.model_dump()
    values["start_at"] = _as_utc(discount_data.start_at)
    values["end_at"] = _as_utc(discount_data.end_at)

    discount = Discount(**values)
    db.add(discount)
    await db.flush()
    return discount


async def update_discount(
    db: AsyncSession,
    discount: Discount,
    discount_data: DiscountUpdate,
) -> Discount:
    values = discount_data.model_dump(exclude_unset=True)
    product_id = values.get("product_id", discount.product_id)
    discount_type = values.get("discount_type", discount.discount_type)
    discount_value = values.get("discount_value", discount.discount_value)
    bundle_quantity = values.get("bundle_quantity", discount.bundle_quantity)
    start_at = _as_utc(values.get("start_at", discount.start_at))
    end_at = _as_utc(values.get("end_at", discount.end_at))
    is_active = values.get("is_active", discount.is_active)

    await _validate_discount(
        db,
        product_id,
        discount_type,
        discount_value,
        bundle_quantity,
        start_at,
        end_at,
        is_active,
        discount.id,
    )

    for field, value in values.items():
        setattr(discount, field, _as_utc(value) if field in {"start_at", "end_at"} else value)

    await db.flush()
    return discount
