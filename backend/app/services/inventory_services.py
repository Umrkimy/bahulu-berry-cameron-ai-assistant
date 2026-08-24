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


async def adjust_inventory(
    db: AsyncSession,
    product_id: int,
    quantity_change: int,
) -> Inventory:

    inventory = await get_inventory_by_product(
        db=db,
        product_id=product_id,
    )

    new_quantity = inventory.quantity + quantity_change

    # Prevent stock from becoming negative
    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient inventory",
        )

    inventory.quantity = new_quantity

    await db.commit()
    await db.refresh(inventory)

    return inventory