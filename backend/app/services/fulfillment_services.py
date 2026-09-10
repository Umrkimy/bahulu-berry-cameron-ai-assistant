from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order
from app.models.order_item import OrderItem


def _queue_stage(order: Order) -> str | None:
    if order.status in {"COMPLETED", "CANCELLED"}:
        return None
    if order.payment_status in {"UNPAID", "FAILED"}:
        return "NEEDS_ATTENTION"
    if order.status == "SHIPPED" and order.delivery and order.delivery.status == "FAILED":
        return "NEEDS_ATTENTION"
    if order.payment_status != "PAID":
        return None
    if order.status == "PENDING":
        return "READY_TO_PREPARE"
    if order.status == "PROCESSING":
        return "IN_PREPARATION"
    if order.status == "SHIPPED":
        return "IN_DELIVERY"
    return None


async def get_fulfillment_queue(db: AsyncSession) -> dict:
    result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.customer),
            selectinload(Order.delivery),
            selectinload(Order.items).selectinload(OrderItem.product),
        )
        .where(Order.status.notin_(("COMPLETED", "CANCELLED")))
        .order_by(Order.created_at.asc())
    )
    items = []
    counts = {stage: 0 for stage in ("NEEDS_ATTENTION", "READY_TO_PREPARE", "IN_PREPARATION", "IN_DELIVERY")}
    for order in result.scalars().all():
        stage = _queue_stage(order)
        if stage is None:
            continue
        delivery = order.delivery
        items.append({
            "id": order.id,
            "customer_name": order.customer.full_name if order.customer else f"Customer #{order.customer_id}",
            "status": order.status,
            "payment_status": order.payment_status,
            "total_amount": order.total_amount,
            "created_at": order.created_at,
            "queue_stage": stage,
            "items": [
                {
                    "id": item.id,
                    "product_name": item.product.name if item.product else f"Product #{item.product_id}",
                    "quantity": item.quantity,
                }
                for item in order.items
            ],
            "delivery": None if delivery is None else {
                "id": delivery.id,
                "status": delivery.status,
                "recipient_name": delivery.recipient_name,
                "recipient_phone": delivery.recipient_phone,
                "address": delivery.address,
                "city": delivery.city,
                "state": delivery.state,
                "postal_code": delivery.postal_code,
                "country": delivery.country,
                "courier": delivery.courier,
                "tracking_number": delivery.tracking_number,
                "updated_at": delivery.updated_at,
            },
        })
        counts[stage] += 1
    return {"items": items, "counts": counts}
