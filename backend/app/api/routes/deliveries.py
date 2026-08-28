from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin
from app.db.database import get_db
from app.models.admin import Admin
from app.schemas.delivery import (
    DeliveryPrivate,
    DeliveryUpdate,
)
from app.services.delivery_services import (
    get_deliveries,
    get_delivery_by_order,
    update_delivery,
)
from app.services.activity_services import record_activity


router = APIRouter()


@router.get(
    "",
    response_model=list[DeliveryPrivate],
)
async def list_deliveries(
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    return await get_deliveries(
        db=db,
    )


@router.get(
    "/orders/{order_id}",
    response_model=DeliveryPrivate,
)
async def get_order_delivery(
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
    delivery = await get_delivery_by_order(
        db=db,
        order_id=order_id,
    )

    if delivery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found for this order.",
        )

    await record_activity(db, admin=current_admin, action="updated", entity_type="delivery", entity_id=delivery.id, description=f"Updated delivery for order #{order_id}.")
    await db.commit()
    return delivery


@router.patch(
    "/orders/{order_id}",
    response_model=DeliveryPrivate,
)
async def update_order_delivery(
    order_id: int,
    delivery_data: DeliveryUpdate,
    db: Annotated[
        AsyncSession,
        Depends(get_db),
    ],
    current_admin: Annotated[
        Admin,
        Depends(get_current_admin),
    ],
):
    update_data = delivery_data.model_dump(
        exclude_unset=True
    )

    try:
        delivery = await update_delivery(
            db=db,
            order_id=order_id,
            update_data=update_data,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update delivery.",
        )

    if delivery is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found for this order.",
        )

    return delivery
