from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.delivery import DELIVERY_STATUS
from app.models.delivery import Delivery
from app.models.order import Order


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
    order = await db.scalar(select(Order).where(Order.id == order_id).with_for_update().execution_options(populate_existing=True))
    delivery = await get_delivery_by_order(
        db=db,
        order_id=order_id,
    )

    if delivery is None:
        return None

    if not update_data:
        return delivery

    if order is None:
        raise ValueError("Order not found.")
    if order.status in {"COMPLETED", "CANCELLED"}:
        if any(getattr(delivery, field) != value for field, value in update_data.items()):
            raise ValueError("Completed or cancelled orders cannot be changed.")
        return delivery

    new_status = None

    if "status" in update_data:
        new_status = update_data["status"]

        if new_status not in DELIVERY_STATUS:
            raise ValueError(
                f"Invalid delivery status '{new_status}'."
            )

        if new_status != delivery.status:
            allowed = {
                "PENDING": {"SHIPPED"},
                "SHIPPED": {"IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED"},
                "IN_TRANSIT": {"OUT_FOR_DELIVERY", "DELIVERED", "FAILED"},
                "OUT_FOR_DELIVERY": {"DELIVERED", "FAILED"},
                "FAILED": {"SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"},
                "DELIVERED": set(),
            }
            if new_status not in allowed.get(delivery.status, set()):
                raise ValueError("This delivery cannot move to that status.")
            if order.payment_status != "PAID":
                raise ValueError("Only paid orders can progress through delivery.")
            if new_status == "SHIPPED":
                raise ValueError("Use the packing and dispatch action to mark a delivery as shipped.")
            if new_status != "SHIPPED" and order.status != "SHIPPED":
                raise ValueError("Dispatch the order before updating delivery progress.")

        if new_status != delivery.status:
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

    if new_status is not None:
        await _sync_order_status(
            db=db,
            order_id=order_id,
            delivery_status=new_status,
        )

    await db.flush()

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


async def _sync_order_status(
    db: AsyncSession,
    order_id: int,
    delivery_status: str,
) -> None:
    """
    Automatically synchronize the order status
    based on the delivery status.
    """

    result = await db.execute(
        select(Order).where(
            Order.id == order_id
        )
    )

    order = result.scalar_one_or_none()

    if order is None:
        return

    if order.status == "CANCELLED":
        return

    if delivery_status in {
        "SHIPPED",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
    }:
        if order.payment_status != "PAID":
            raise ValueError("Only paid orders can be marked as shipped.")
        if order.status != "COMPLETED":
            order.status = "SHIPPED"

    elif delivery_status == "DELIVERED":
        if order.payment_status != "PAID":
            raise ValueError("Only paid orders can be marked as delivered.")
        order.status = "COMPLETED"

        if hasattr(order, "completed_at"):
            order.completed_at = datetime.now(UTC)


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
