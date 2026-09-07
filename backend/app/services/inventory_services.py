from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.inventory import Inventory
from app.models.admin import Admin
from app.models.stock_movement import StockMovement


async def get_inventory_by_product(
    db: AsyncSession,
    product_id: int,
) -> Inventory:
    result = await db.execute(
        select(Inventory).with_for_update().execution_options(populate_existing=True).where(
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
    *,
    movement_type: str | None = None,
    reason: str | None = None,
    supplier_id: int | None = None,
    reference: str | None = None,
    admin: Admin | None = None,
    source_type: str | None = None,
    source_id: int | None = None,
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

    if quantity_change == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock movement cannot be zero.")

    movement_type = movement_type or ("MANUAL_INCREASE" if quantity_change > 0 else "MANUAL_DECREASE")
    inventory.quantity = new_quantity
    db.add(StockMovement(
        inventory_id=inventory.id,
        product_id=inventory.product_id,
        supplier_id=supplier_id,
        admin_id=admin.id if admin else None,
        movement_type=movement_type,
        quantity_change=quantity_change,
        quantity_before=new_quantity - quantity_change,
        quantity_after=new_quantity,
        reason=reason,
        reference=reference,
        source_type=source_type,
        source_id=source_id,
    ))

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

    if quantity == inventory.quantity:
        return inventory

    return await adjust_inventory(
        db, product_id, quantity - inventory.quantity,
        movement_type="MANUAL_INCREASE" if quantity > inventory.quantity else "MANUAL_DECREASE",
        reason="Inventory quantity correction.",
    )
