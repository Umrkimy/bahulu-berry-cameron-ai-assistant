from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.order import Order
from app.models.customer import Customer
from app.models.admin import Admin
from app.auth.dependencies import (
    get_current_admin,
    get_current_superuser,
)
from app.schemas.order import (
    OrderCreate,
    OrderPrivate,
    OrderUpdate,
)

router = APIRouter()

@router.get("", response_model=list[OrderPrivate],)
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
    result = await db.execute(select(Order))
    
    orders = result.scalars().all()

    return orders


@router.get("/{order_id}", response_model=OrderPrivate,)
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
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalars().first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="Order not found",)

    return order


@router.post("",response_model=OrderPrivate, status_code=status.HTTP_201_CREATED,)
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
    # Check customer exists
    result = await db.execute(
        select(Customer).where(Customer.id == order_data.customer_id))

    customer = result.scalars().first()

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    order = Order(
        customer_id=order_data.customer_id,
        status="PENDING",
        payment_status="UNPAID",
        total_amount=0,
    )

    db.add(order)
    await db.commit()
    await db.refresh(order)

    return order


@router.patch("/{order_id}",response_model=OrderPrivate,)
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

    result = await db.execute(
        select(Order).where(Order.id == order_id)
    )

    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    update_data = order_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():

        setattr(order, field, value)

    await db.commit()
    await db.refresh(order)

    return order


@router.delete("/{order_id}",status_code=status.HTTP_204_NO_CONTENT,)
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
        select(Order).where(Order.id == order_id)
    )

    order = result.scalars().first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    await db.delete(order)
    await db.commit()