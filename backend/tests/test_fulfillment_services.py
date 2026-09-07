from decimal import Decimal

import pytest

from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.order import Order
from app.services.fulfillment_services import get_fulfillment_queue
from app.services.order_services import update_order


@pytest.mark.asyncio
async def test_fulfillment_queue_groups_only_actionable_orders(session):
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    session.add(customer)
    await session.flush()
    pending_paid = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="PENDING", payment_status="PAID")
    processing_paid = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="PROCESSING", payment_status="PAID")
    unpaid = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="PENDING", payment_status="UNPAID")
    shipped_failed = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="SHIPPED", payment_status="PAID")
    completed = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="COMPLETED", payment_status="PAID")
    session.add_all([pending_paid, processing_paid, unpaid, shipped_failed, completed])
    await session.flush()
    session.add(Delivery(order_id=shipped_failed.id, status="FAILED"))
    await session.commit()

    queue = await get_fulfillment_queue(session)

    assert queue["counts"] == {"NEEDS_ATTENTION": 2, "READY_TO_PREPARE": 1, "IN_PREPARATION": 1, "IN_DELIVERY": 0}
    assert {item["id"] for item in queue["items"]} == {pending_paid.id, processing_paid.id, unpaid.id, shipped_failed.id}


@pytest.mark.asyncio
async def test_unpaid_order_cannot_begin_preparation(session):
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    session.add(customer)
    await session.flush()
    order = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="PENDING", payment_status="UNPAID")
    session.add(order)
    await session.commit()

    result = await update_order(session, order.id, status="PROCESSING")

    assert result == {"success": False, "error": "Only paid orders can begin preparation."}
