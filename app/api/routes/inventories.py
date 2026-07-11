from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.inventory import Inventory
from app.models.admin import Admin
from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.schemas.inventory import (
    InventoryPublic,
    InventoryUpdate,
)

router = APIRouter()


# GET ALL INVENTORIES
@router.get(
    "",
    response_model=list[InventoryPublic],
)
async def get_inventories(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await db.execute(
        select(Inventory)
    )

    inventories = result.scalars().all()

    return inventories


# GET INVENTORY BY ID
@router.get(
    "/{inventory_id}",
    response_model=InventoryPublic,
)
async def get_inventory(
    inventory_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    result = await db.execute(
        select(Inventory)
        .where(Inventory.id == inventory_id)
    )

    inventory = result.scalar_one_or_none()


    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )


    return inventory


# GET INVENTORY BY PRODUCT ID
@router.get(
    "/product/{product_id}",
    response_model=InventoryPublic,
)
async def get_product_inventory(
    product_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    result = await db.execute(
        select(Inventory)
        .where(Inventory.product_id == product_id)
    )

    inventory = result.scalar_one_or_none()


    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    return inventory


# UPDATE INVENTORY
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

    result = await db.execute(
        select(Inventory)
        .where(Inventory.id == inventory_id)
    )

    inventory = result.scalar_one_or_none()


    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )


    update_data = inventory_data.model_dump(
        exclude_unset=True
    )


    for field, value in update_data.items():

        setattr(
            inventory,
            field,
            value
        )


    await db.commit()
    await db.refresh(inventory)


    return inventory


# DELETE INVENTORY
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
        .where(Inventory.id == inventory_id)
    )

    inventory = result.scalar_one_or_none()


    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )


    await db.delete(inventory)

    await db.commit()