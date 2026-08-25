from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Inventory


async def get_inventory_by_product(
    db: AsyncSession,
    product_id: int,
) -> Inventory:
    result = await db.execute(
        select(Inventory).where(
            Inventory.product_id == product_id
        )
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Inventory for product #{product_id} "
                "was not found."
            ),
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

    new_quantity = (
        inventory.quantity
        + quantity_change
    )

    if new_quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient inventory.",
        )

    inventory.quantity = new_quantity

    return inventory


async def set_inventory_quantity(
    db: AsyncSession,
    product_id: int,
    quantity: int,
) -> Inventory:
    if quantity < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inventory quantity cannot be negative.",
        )

    inventory = await get_inventory_by_product(
        db=db,
        product_id=product_id,
    )

    inventory.quantity = quantity

    return inventory