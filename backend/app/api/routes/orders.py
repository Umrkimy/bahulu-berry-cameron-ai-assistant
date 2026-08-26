from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.db.database import get_db
from app.models.admin import Admin
from app.models.order import Order
from app.schemas.order import (
    OrderCreate,
    OrderPrivate,
    OrderUpdate,
)
from app.services.order_services import (
    cancel_order,
    create_order as service_create_order,
    update_order as service_update_order,
)

router = APIRouter()


@router.get(
    "",
    response_model=list[OrderPrivate],
)
async def get_orders(
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
        select(Order).order_by(
            Order.created_at.desc()
        )
    )

    return result.scalars().all()


@router.get(
    "/{order_id}",
    response_model=OrderPrivate,
)
async def get_order(
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
    result = await db.execute(
        select(Order).where(
            Order.id == order_id
        )
    )

    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return order


@router.post(
    "",
    response_model=OrderPrivate,
    status_code=status.HTTP_201_CREATED,
)
async def create_order(
    order_data: OrderCreate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    result = await service_create_order(
        db=db,
        customer_id=order_data.customer_id,
        items=[
            {
                "product_id": item.product_id,
                "quantity": item.quantity,
            }
            for item in order_data.items
        ],
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    created_order = result["order"]

    order_result = await db.execute(
        select(Order).where(
            Order.id == created_order["id"]
        )
    )

    order = order_result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order was created but could not be retrieved.",
        )

    return order


@router.patch(
    "/{order_id}",
    response_model=OrderPrivate,
)
async def update_order(
    order_id: int,
    order_data: OrderUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    update_data = order_data.model_dump(
        exclude_unset=True
    )

    result = await service_update_order(
        db=db,
        order_id=order_id,
        **update_data,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    order_result = await db.execute(
        select(Order).where(
            Order.id == order_id
        )
    )

    order = order_result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order was updated but could not be retrieved.",
        )

    return order


@router.post(
    "/{order_id}/cancel",
)
async def cancel_order_route(
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
    result = await cancel_order(
        db=db,
        order_id=order_id,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["error"],
        )

    return result


@router.delete(
    "/{order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_order(
    order_id: int,
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
        select(Order).where(
            Order.id == order_id
        )
    )

    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    await db.delete(order)
    await db.commit()