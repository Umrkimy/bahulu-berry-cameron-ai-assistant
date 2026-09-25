from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


def product_sale_price(product: Product) -> Decimal | None:
    def money(value):
        return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    price = money(Decimal(str(product.price)))
    changed = False
    for discount in sorted(product.active_discounts, key=lambda d: ({"PERCENTAGE": 1, "FIXED_AMOUNT": 2}.get(d.discount_type, 99), d.id)):
        value = Decimal(str(discount.discount_value))
        if discount.discount_type == "PERCENTAGE":
            price = money(price - money(price * value / Decimal("100")))
            changed = True
        elif discount.discount_type == "FIXED_AMOUNT":
            price = money(max(Decimal("0"), price - value))
            changed = True
    return price if changed else None


async def get_product_by_name(
    db: AsyncSession,
    product_name: str,
) -> Product | None:

    search_name = product_name.strip().lower()

    if not search_name:
        return None

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .where(
            func.lower(Product.name) == search_name,
            Product.is_active == True,
        )
    )

    product = result.scalars().first()

    if product is not None:
        return product

    # Fall back to partial match
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .where(
            func.lower(Product.name).contains(search_name),
            Product.is_active == True,
        )
    )

    products = result.scalars().all()

    if len(products) == 1:
        return products[0]

    return None
