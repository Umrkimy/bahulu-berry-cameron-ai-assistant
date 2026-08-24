from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


async def get_product_by_name(
    db: AsyncSession,
    product_name: str,
) -> Product | None:

    search_name = product_name.strip().lower()

    result = await db.execute(
        select(Product)
        .options(selectinload(Product.inventory))
        .where(
            func.lower(Product.name).contains(search_name),
            Product.is_active == True,
        )
    )

    return result.scalars().first()