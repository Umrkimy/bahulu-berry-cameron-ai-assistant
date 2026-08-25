from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.db.database import get_db
from app.models.admin import Admin
from app.models.inventory import Inventory
from app.schemas.inventory import (
    InventoryAdjustment,
    InventoryPublic,
    InventoryUpdate,
)
from app.services.inventory_services import (
    adjust_inventory,
    set_inventory_quantity,
)


router = APIRouter()


def serialize_inventory(
    inventory: Inventory,
) -> InventoryPublic:
    if inventory.product is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Inventory product could not be loaded.",
        )

    return InventoryPublic(
        id=inventory.id,
        product_id=inventory.product_id,
        product_name=inventory.product.name,
        product_category=inventory.product.category,
        quantity=inventory.quantity,
        low_stock_threshold=inventory.low_stock_threshold,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
    )


async def get_inventory_with_product(
    db: AsyncSession,
    inventory_id: int,
) -> Inventory | None:
    result = await db.execute(
        select(Inventory)
        .options(
            selectinload(Inventory.product)
        )
        .where(
            Inventory.id == inventory_id
        )
    )

    return result.scalar_one_or_none()



@router.get(
    "",
    response_model=list[InventoryPublic],
)
async def get_inventories(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await db.execute(
        select(Inventory)
        .options(
            selectinload(Inventory.product)
        )
        .order_by(
            Inventory.id.asc()
        )
    )

    inventories = result.scalars().all()

    return [
        serialize_inventory(inventory)
        for inventory in inventories
    ]


@router.get(
    "/{inventory_id}",
    response_model=InventoryPublic,
)
async def get_inventory(
    inventory_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return serialize_inventory(inventory)



@router.get(
    "/product/{product_id}",
    response_model=InventoryPublic,
)
async def get_product_inventory(
    product_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await db.execute(
        select(Inventory)
        .options(
            selectinload(Inventory.product)
        )
        .where(
            Inventory.product_id == product_id
        )
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return serialize_inventory(inventory)


@router.patch(
    "/{inventory_id}/adjust",
    response_model=InventoryPublic,
)
async def adjust_inventory_route(
    inventory_id: int,
    inventory_data: InventoryAdjustment,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    if inventory_data.quantity_change == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stock adjustment cannot be zero.",
        )

    try:
        await adjust_inventory(
            db=db,
            product_id=inventory.product_id,
            quantity_change=inventory_data.quantity_change,
        )

        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to adjust inventory.",
        )

    # Re-query instead of relying on refresh + relationship state.
    updated_inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if updated_inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found after update.",
        )

    return serialize_inventory(updated_inventory)


@router.patch(
    "/{inventory_id}",
    response_model=InventoryPublic,
)
async def update_inventory(
    inventory_id: int,
    inventory_data: InventoryUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    try:
        # Update quantity through the service.
        if inventory_data.quantity is not None:
            await set_inventory_quantity(
                db=db,
                product_id=inventory.product_id,
                quantity=inventory_data.quantity,
            )

        # Update threshold directly.
        if inventory_data.low_stock_threshold is not None:
            inventory.low_stock_threshold = (
                inventory_data.low_stock_threshold
            )

        await db.commit()

    except HTTPException:
        await db.rollback()
        raise

    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update inventory.",
        )

    updated_inventory = await get_inventory_with_product(
        db=db,
        inventory_id=inventory_id,
    )

    if updated_inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found after update.",
        )

    return serialize_inventory(updated_inventory)


@router.delete(
    "/{inventory_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_inventory(
    inventory_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
    ],
):
    result = await db.execute(
        select(Inventory)
        .where(
            Inventory.id == inventory_id
        )
    )

    inventory = result.scalar_one_or_none()

    if inventory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    await db.delete(inventory)
    await db.commit()

    return None