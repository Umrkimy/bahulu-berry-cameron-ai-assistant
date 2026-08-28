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
    OrderQuoteRequest,
    OrderQuoteResponse,
    OrderUpdate,
)
from app.services.order_services import (
    cancel_order,
    create_order as service_create_order,
    update_order as service_update_order,
)
from app.services.pricing_services import calculate_order_pricing
from app.services.activity_services import record_activity

router = APIRouter()


@router.post(
    "/quote",
    response_model=OrderQuoteResponse,
)
async def quote_order(
    quote_data: OrderQuoteRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_admin)],
):
    try:
        return await calculate_order_pricing(
            db,
            [item.model_dump() for item in quote_data.items],
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


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

    await record_activity(db, admin=current_admin, action="created", entity_type="order", entity_id=order.id, description=f"Created order #{order.id}.")
    await db.commit()
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
    if current_admin.role != "OWNER" and update_data.get("status") == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owners can cancel orders.")

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

    await record_activity(db, admin=current_admin, action="updated", entity_type="order", entity_id=order.id, description=f"Updated order #{order.id}.")
    await db.commit()
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
        Depends(get_current_superuser),
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

    await record_activity(db, admin=current_admin, action="cancelled", entity_type="order", entity_id=order_id, description=f"Cancelled order #{order_id} and restored eligible stock.")
    await db.commit()
    return result


@router.delete(
    "/{order_id}",
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
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Orders are retained for business records. Cancel an eligible order instead.",
    )
