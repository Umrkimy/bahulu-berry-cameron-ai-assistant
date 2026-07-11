from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Inventory


async def get_inventory_by_product(
    db: AsyncSession,
    product_id: int,
) -> Inventory:

    result = await db.execute(
        select(Inventory).where(Inventory.product_id == product_id)
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return inventory
