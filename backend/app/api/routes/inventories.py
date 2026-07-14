from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


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


def serialize_inventory(
    inventory: Inventory,
) -> InventoryPublic:

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


# GET ALL INVENTORIES

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
            selectinload(
                Inventory.product
            )
        )

    )

    inventories = result.scalars().all()
    return [
        serialize_inventory(item)
        for item in inventories

    ]


# GET INVENTORY BY ID

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

    result = await db.execute(

        select(Inventory)
        .options(
            selectinload(
                Inventory.product
            )
        )
        .where(
            Inventory.id == inventory_id
        )
    )

    inventory = result.scalar_one_or_none()

    if not inventory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",

        )
    return serialize_inventory(inventory)


# GET INVENTORY BY PRODUCT ID

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
            selectinload(
                Inventory.product
            )
        )
        .where(
            Inventory.product_id == product_id
        )

    )

    inventory = result.scalar_one_or_none()

    if not inventory:

        raise HTTPException(

            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",

        )
    return serialize_inventory(inventory)


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

        .options(
            selectinload(
                Inventory.product
            )
        )

        .where(
            Inventory.id == inventory_id
        )

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

    return serialize_inventory(inventory)


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

        .where(
            Inventory.id == inventory_id
        )
    )

    inventory = result.scalar_one_or_none()

    if not inventory:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory not found",
        )

    await db.delete(inventory)
    await db.commit()