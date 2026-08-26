from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.delivery import DELIVERY_STATUS
from app.models.delivery import Delivery


async def get_delivery_by_order(
    db: AsyncSession,
    order_id: int,
) -> Delivery | None:
    result = await db.execute(
        select(Delivery).where(
            Delivery.order_id == order_id
        )
    )

    return result.scalar_one_or_none()


async def get_deliveries(
    db: AsyncSession,
) -> list[Delivery]:
    result = await db.execute(
        select(Delivery)
        .order_by(
            Delivery.created_at.desc()
        )
    )

    return result.scalars().all()


async def update_delivery(
    db: AsyncSession,
    order_id: int,
    update_data: dict,
) -> Delivery | None:
    delivery = await get_delivery_by_order(
        db=db,
        order_id=order_id,
    )

    if delivery is None:
        return None

    if not update_data:
        return delivery

    if "status" in update_data:
        new_status = update_data["status"]

        if new_status not in DELIVERY_STATUS:
            raise ValueError(
                f"Invalid delivery status '{new_status}'."
            )

        _update_delivery_timestamp(
            delivery=delivery,
            new_status=new_status,
        )

    for field, value in update_data.items():
        setattr(
            delivery,
            field,
            value,
        )

    try:
        await db.commit()

    except Exception:
        await db.rollback()
        raise

    await db.refresh(delivery)

    return delivery


async def update_delivery_status(
    db: AsyncSession,
    order_id: int,
    new_status: str,
) -> Delivery | None:
    normalized_status = new_status.strip().upper()

    if normalized_status not in DELIVERY_STATUS:
        raise ValueError(
            f"Invalid delivery status "
            f"'{new_status}'. "
            f"Allowed statuses: "
            f"{', '.join(DELIVERY_STATUS)}."
        )

    return await update_delivery(
        db=db,
        order_id=order_id,
        update_data={
            "status": normalized_status,
        },
    )


def _update_delivery_timestamp(
    delivery: Delivery,
    new_status: str,
) -> None:
    now = datetime.now(UTC)

    if new_status == "SHIPPED":
        delivery.shipped_at = now

    elif new_status == "OUT_FOR_DELIVERY":
        delivery.out_for_delivery_at = now

    elif new_status == "DELIVERED":
        delivery.delivered_at = now

    elif new_status == "FAILED":
        delivery.failed_at = now