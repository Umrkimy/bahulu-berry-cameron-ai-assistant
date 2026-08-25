from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


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