from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.orders import dispatch_order
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.schemas.order import OrderDispatch
from app.services.fulfillment_services import get_fulfillment_queue


async def create_paid_order(session):
    owner = Admin(username="packing-owner", email="packing-owner@example.test", password_hash="unused", role="OWNER", is_active=True)
    staff = Admin(username="packing-staff", email="packing-staff@example.test", password_hash="unused", role="STAFF", is_active=True)
    customer = Customer(full_name="Fictional Packing Customer", phone_number="0000000000")
    product = Product(name="Fictional Bahulu", price=Decimal("8.00"))
    session.add_all([owner, staff, customer, product])
    await session.flush()
    order = Order(customer_id=customer.id, status="PROCESSING", payment_status="PAID", total_amount=Decimal("16.00"))
    session.add(order)
    await session.flush()
    session.add_all([
        OrderItem(order_id=order.id, product_id=product.id, quantity=2, unit_price=Decimal("8.00"), subtotal=Decimal("16.00"), total_amount=Decimal("16.00")),
        Delivery(order_id=order.id, recipient_name=customer.full_name, recipient_phone=customer.phone_number, address="Fictional address", city="Cameron Highlands", state="Pahang", postal_code="39000", country="MY"),
    ])
    await session.commit()
    return owner, staff, order


@pytest.mark.asyncio
async def test_fulfillment_queue_includes_authenticated_packing_details(session):
    _, _, order = await create_paid_order(session)
    queue = await get_fulfillment_queue(session)
    item = next(row for row in queue["items"] if row["id"] == order.id)
    assert item["items"] == [{"id": item["items"][0]["id"], "product_name": "Fictional Bahulu", "quantity": 2}]
    assert item["delivery"]["recipient_name"] == "Fictional Packing Customer"


@pytest.mark.asyncio
async def test_dispatch_requires_packing_confirmation_and_records_it(session):
    owner, staff, order = await create_paid_order(session)
    with pytest.raises(Exception):
        OrderDispatch()
    dispatched = await dispatch_order(order.id, OrderDispatch(packing_confirmed=True), session, staff)
    assert dispatched.status == "SHIPPED"
    entries = (await session.execute(select(ActivityLog).where(ActivityLog.entity_id == order.id))).scalars().all()
    assert any(entry.action == "confirmed" and "Confirmed packing" in entry.description for entry in entries)
    assert staff.role == "STAFF" and owner.role == "OWNER"


@pytest.mark.asyncio
async def test_dispatch_rejects_unpaid_or_orders_without_items(session):
    owner, _, order = await create_paid_order(session)
    order.payment_status = "UNPAID"
    await session.commit()
    with pytest.raises(HTTPException, match="paid"):
        await dispatch_order(order.id, OrderDispatch(packing_confirmed=True), session, owner)
    order.payment_status = "PAID"
    items = (await session.execute(select(OrderItem).where(OrderItem.order_id == order.id))).scalars().all()
    for item in items:
        await session.delete(item)
    await session.commit()
    with pytest.raises(HTTPException, match="must contain items"):
        await dispatch_order(order.id, OrderDispatch(packing_confirmed=True), session, owner)
