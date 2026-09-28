from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.admin import Admin
from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.schemas.order_item import (
    OrderItemCreate,
    OrderItemPublic,
    OrderItemUpdate,
)

router = APIRouter()


# GET ALL ITEMS FROM ORDER
@router.get(
    "/orders/{order_id}/items",
    response_model=list[OrderItemPublic],
)
async def get_order_items(
    order_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):

    # Check order exists
    order = await db.get(Order, order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))

    return result.scalars().all()


# GET SINGLE ITEM
@router.get(
    "/orders/{order_id}/items/{item_id}",
    response_model=OrderItemPublic,
)
async def get_order_item(
    order_id: int,
    item_id: int,
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
        select(OrderItem).where(
            OrderItem.id == item_id,
            OrderItem.order_id == order_id,
        )
    )

    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Order item not found",
        )

    return item


# CREATE ORDER ITEM
@router.post(
    "/orders/{order_id}/items",
    response_model=OrderItemPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_order_item(
    order_id: int,
    item_data: OrderItemCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Order items are created only through the order workflow so pricing and stock stay accurate.",
    )


# UPDATE ORDER ITEM
@router.patch(
    "/orders/{order_id}/items/{item_id}",
    response_model=OrderItemPublic,
)
async def update_order_item(
    order_id: int,
    item_id: int,
    item_data: OrderItemUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Order item changes are not supported after an order is created.",
    )


# DELETE ORDER ITEM
@router.delete(
    "/orders/{order_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_order_item(
    order_id: int,
    item_id: int,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_superuser),
    ],
):
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Order item changes are not supported after an order is created.",
    )
