import asyncio
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.routes.activity import list_activity
from app.auth.dependencies import get_current_superuser
from app.api.routes.orders import dispatch_order
from app.api.routes.tasks import create_task, list_tasks, update_task
from app.core.config import settings
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.delivery import Delivery
from app.models.messaging import MessagingEvent
from app.models.support import SupportRequest
from app.schemas.order import OrderDispatch
from app.schemas.task import TaskInput, TaskUpdate
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.services.ai_usage_services import AIBudgetExceeded, calculate_cost_usd, reserve_ai_usage
from app.services.delivery_services import update_delivery
from app.services import messaging, ai_assistant_services as ai


async def actors(db):
    owner = Admin(username="test-owner", email="owner@example.test", password_hash="unused", role="OWNER", is_active=True)
    staff = Admin(username="test-staff", email="staff@example.test", password_hash="unused", role="STAFF", is_active=True)
    inactive = Admin(username="test-inactive", email="inactive@example.test", password_hash="unused", role="STAFF", is_active=False)
    db.add_all([owner, staff, inactive])
    await db.commit()
    return owner, staff, inactive


async def paid_order(db):
    customer = Customer(full_name="Fictional Customer", phone_number="0000000000")
    db.add(customer)
    await db.flush()
    order = Order(customer_id=customer.id, status="PROCESSING", payment_status="PAID", total_amount=Decimal("10.00"))
    db.add(order)
    await db.flush()
    product = Product(name="Fictional test product", price=Decimal("10.00"))
    db.add(product)
    await db.flush()
    db.add(OrderItem(order_id=order.id, product_id=product.id, quantity=1, unit_price=Decimal("10.00"), subtotal=Decimal("10.00"), total_amount=Decimal("10.00")))
    delivery = Delivery(order_id=order.id, status="PENDING", courier="Test courier", tracking_number="fictional-reference")
    db.add(delivery)
    await db.commit()
    return order, delivery


@pytest.mark.asyncio
async def test_dispatch_preserves_details_and_delivery_cannot_regress(session):
    owner, _, _ = await actors(session)
    order, delivery = await paid_order(session)
    await dispatch_order(order.id, OrderDispatch(packing_confirmed=True), session, owner)
    assert delivery.tracking_number == "fictional-reference"
    assert delivery.courier == "Test courier"
    await update_delivery(session, order.id, {"status": "IN_TRANSIT"})
    assert order.status == "SHIPPED"
    with pytest.raises(ValueError):
        await update_delivery(session, order.id, {"status": "PENDING"})
    assert delivery.status == "IN_TRANSIT"
    await update_delivery(session, order.id, {"status": "DELIVERED"})
    assert order.status == "COMPLETED"
    with pytest.raises(ValueError):
        await update_delivery(session, order.id, {"status": "FAILED"})
    assert delivery.status == "DELIVERED"


@pytest.mark.asyncio
async def test_dispatch_audit_failure_rolls_back_both_records(session, monkeypatch):
    from app.api.routes import orders
    owner, _, _ = await actors(session)
    order, delivery = await paid_order(session)
    order_id, delivery_id = order.id, delivery.id
    async def fail(*args, **kwargs):
        raise RuntimeError("simulated audit failure")
    monkeypatch.setattr(orders, "record_activity", fail)
    with pytest.raises(RuntimeError):
        await dispatch_order(order_id, OrderDispatch(packing_confirmed=True), session, owner)
    await session.rollback()
    assert (await session.get(Order, order_id)).status == "PROCESSING"
    assert (await session.get(Delivery, delivery_id)).status == "PENDING"


@pytest.mark.asyncio
async def test_task_permissions_and_activity_privacy(session):
    owner, staff, inactive = await actors(session)
    private = await create_task(TaskInput(title="Owner private work", assigned_admin_id=owner.id), session, owner)
    own = await create_task(TaskInput(title="Staff work", assigned_admin_id=staff.id), session, owner)
    assert [task.id for task in await list_tasks(session, staff)] == [own.id]
    with pytest.raises(HTTPException, match="Permission denied"):
        await get_current_superuser(staff)
    for task_id, data in [(private.id, TaskUpdate(status="COMPLETED")), (own.id, TaskUpdate(description="Changed"))]:
        with pytest.raises(HTTPException) as exc:
            await update_task(task_id, data, session, staff)
        assert exc.value.status_code == 403
    with pytest.raises(HTTPException):
        await update_task(own.id, TaskUpdate(assigned_admin_id=inactive.id), session, owner)
    assert own.assigned_admin_id == staff.id


@pytest.mark.asyncio
async def test_human_takeover_suppresses_inbound_drafts_and_retention(session, monkeypatch):
    owner, staff, _ = await actors(session)
    first = await messaging.process_inbound_message(session, message=messaging.NormalizedInboundMessage("SIMULATOR", "first", "conversation", "fictional", "I want a human", "EN"), actor=owner)
    ticket = await session.get(SupportRequest, first.support_request_id)
    ticket.handoff_state = "HUMAN_HANDLING"
    ticket.assigned_admin_id = staff.id
    await session.commit()
    async def no_draft(*args, **kwargs):
        raise AssertionError("Draft must not run during human takeover")
    monkeypatch.setattr(messaging, "create_grounded_draft", no_draft)
    result = await messaging.process_inbound_message(session, message=messaging.NormalizedInboundMessage("SIMULATOR", "second", "conversation", "fictional", "Hello", "EN"), actor=owner)
    assert result.draft is None and result.outcome == "HANDOFF"
    assert ticket.assigned_admin_id == staff.id
    event = await session.scalar(select(MessagingEvent).where(MessagingEvent.external_message_id == "second"))
    event.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await session.commit()
    await messaging.purge_expired_message_content(session)
    await session.refresh(event)
    assert event.content is None


@pytest.mark.asyncio
async def test_confirmation_executes_once_and_staff_cannot_confirm(session, monkeypatch):
    owner, staff, _ = await actors(session)
    calls = []
    async def handler(**kwargs):
        calls.append(kwargs)
        return {"success": True, "message": "Updated"}
    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", handler)
    await ai._store_confirmation(session, owner.id, "conversation", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    assert await ai._execute_pending_confirmation(session, staff.id, "conversation", "confirm") is None
    assert await ai._execute_pending_confirmation(session, owner.id, "conversation", "confirm") == "Updated"
    assert await ai._execute_pending_confirmation(session, owner.id, "conversation", "confirm") is None
    assert len(calls) == 1


@pytest.mark.asyncio
async def test_demoted_owner_cannot_execute_saved_confirmation(session, monkeypatch):
    owner, _, _ = await actors(session)
    await ai._store_confirmation(session, owner.id, "demotion", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    owner.role = "STAFF"
    await session.commit()
    async def forbidden(**kwargs):
        raise AssertionError("Demoted owners cannot execute writes")
    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", forbidden)
    result = await ai._execute_pending_confirmation(session, owner.id, "demotion", "confirm")
    assert "Only an active Owner" in result
    assert await session.scalar(select(func.count()).select_from(ActivityLog)) == 0


@pytest.mark.asyncio
async def test_postgres_concurrent_budget_and_duplicate_intake(session, monkeypatch):
    if session.get_bind().dialect.name != "postgresql":
        pytest.skip("Requires disposable PostgreSQL")
    owner, _, _ = await actors(session)
    owner_id = owner.id
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    reserve = calculate_cost_usd("gpt-4o-mini", settings.AI_MAX_RESERVED_INPUT_TOKENS, settings.AI_MAX_COMPLETION_TOKENS)
    monkeypatch.setattr(settings, "AI_MONTHLY_BUDGET_USD", float(reserve * Decimal("1.5")))
    async def request_budget():
        async with factory() as db:
            try:
                await reserve_ai_usage(db, admin_id=owner_id, model="gpt-4o-mini")
                return True
            except AIBudgetExceeded:
                return False
    assert sorted(await asyncio.gather(request_budget(), request_budget())) == [False, True]
    async def inbound():
        async with factory() as db:
            return await messaging.process_inbound_message(db, message=messaging.NormalizedInboundMessage("SIMULATOR", "same-message", "same-conversation", "fictional", "I want a human", "EN"))
    results = await asyncio.gather(inbound(), inbound())
    assert sorted(result.duplicate for result in results) == [False, True]
    assert await session.scalar(select(func.count()).select_from(MessagingEvent)) == 1
    assert await session.scalar(select(func.count()).select_from(SupportRequest)) == 1


@pytest.mark.asyncio
async def test_postgres_dispatch_and_confirmation_are_once_only(session, monkeypatch):
    if session.get_bind().dialect.name != "postgresql":
        pytest.skip("Requires disposable PostgreSQL")
    owner, _, _ = await actors(session)
    order, _ = await paid_order(session)
    order_id, owner_id = order.id, owner.id
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    async def dispatch():
        async with factory() as db:
            try:
                await dispatch_order(order_id, OrderDispatch(packing_confirmed=True), db, owner)
                return True
            except HTTPException:
                return False
    assert sorted(await asyncio.gather(dispatch(), dispatch())) == [False, True]
    assert await session.scalar(select(func.count()).select_from(ActivityLog)) == 3
    await session.commit()
    calls = []
    async def handler(**kwargs):
        calls.append(1)
        await asyncio.sleep(0.05)
        return {"success": True, "message": "Done"}
    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", handler)
    await ai._store_confirmation(session, owner_id, "concurrent", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    async def confirm():
        async with factory() as db:
            return await ai._execute_pending_confirmation(db, owner_id, "concurrent", "confirm")
    await asyncio.gather(confirm(), confirm())
    assert len(calls) == 1
