from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery import Delivery
from app.models.inventory import Inventory
from app.models.order import Order


async def resolve_task_context(
    db: AsyncSession, context_type: str | None, context_id: int | None
) -> tuple[str | None, int | None, str | None]:
    if context_type is None and context_id is None:
        return None, None, None
    if context_type is None or context_id is None:
        raise ValueError("Choose both a task context type and record.")
    if context_type == "ORDER":
        record = await db.get(Order, context_id)
        if record is None:
            raise ValueError("The selected order is no longer available.")
        return context_type, context_id, f"Order #{record.id}"
    if context_type == "DELIVERY":
        record = await db.get(Delivery, context_id)
        if record is None:
            raise ValueError("The selected delivery is no longer available.")
        return context_type, context_id, f"Delivery for Order #{record.order_id}"
    if context_type == "INVENTORY":
        result = await db.execute(
            select(Inventory).options(selectinload(Inventory.product)).where(Inventory.id == context_id)
        )
        record = result.scalar_one_or_none()
        if record is None or record.product is None:
            raise ValueError("The selected inventory record is no longer available.")
        return context_type, context_id, f"{record.product.name} inventory"
    raise ValueError("Choose a valid task context type.")
