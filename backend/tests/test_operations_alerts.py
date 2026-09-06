from decimal import Decimal

import pytest

from app.models.admin import Admin
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.product import Product
from app.models.refund_request import RefundRequest
from app.models.support import SupportRequest
from app.services.operations_services import get_operation_alerts


@pytest.mark.asyncio
async def test_operations_alerts_use_live_state_and_hide_owner_refunds_from_staff(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="test", role="OWNER", is_active=True)
    staff = Admin(username="staff", email="staff@example.test", password_hash="test", role="STAFF", is_active=True)
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    out_of_stock = Product(name="Fictional Out", price=Decimal("10.00"), is_active=True)
    low_stock = Product(name="Fictional Low", price=Decimal("10.00"), is_active=True)
    inactive_product = Product(name="Inactive Product", price=Decimal("10.00"), is_active=False)
    session.add_all([owner, staff, customer, out_of_stock, low_stock, inactive_product])
    await session.flush()

    out_inventory = Inventory(product_id=out_of_stock.id, quantity=0, low_stock_threshold=5)
    low_inventory = Inventory(product_id=low_stock.id, quantity=2, low_stock_threshold=5)
    session.add_all([
        out_inventory,
        low_inventory,
        Inventory(product_id=inactive_product.id, quantity=0, low_stock_threshold=5),
    ])
    order = Order(customer_id=customer.id, total_amount=Decimal("10.00"), status="PENDING", payment_status="PAID")
    session.add(order)
    await session.flush()

    urgent_ticket = SupportRequest(customer_name="Fictional Customer", subject="Fictional urgent request", priority="URGENT", status="NEW")
    resolved_ticket = SupportRequest(customer_name="Fictional Customer", subject="Resolved request", priority="URGENT", status="RESOLVED")
    refund = RefundRequest(order_id=order.id, requested_by_admin_id=owner.id, status="APPROVED", reason="Fictional reason")
    session.add_all([urgent_ticket, resolved_ticket, refund])
    await session.commit()

    owner_alerts = await get_operation_alerts(session, owner)
    owner_categories = {alert["category"] for alert in owner_alerts["items"]}
    assert owner_categories == {"INVENTORY", "ORDER", "SUPPORT", "REFUND"}
    assert any(alert["id"] == f"inventory-{out_of_stock.id}" and alert["severity"] == "CRITICAL" for alert in owner_alerts["items"])
    assert any(alert["id"] == f"support-{urgent_ticket.id}" and alert["severity"] == "CRITICAL" for alert in owner_alerts["items"])
    assert all("Inactive Product" not in alert["title"] for alert in owner_alerts["items"])

    filtered = await get_operation_alerts(session, owner, category="INVENTORY", severity="CRITICAL", search="out", limit=1)
    assert filtered["total"] == 1
    assert filtered["items"][0]["href"] == "/inventory"

    staff_alerts = await get_operation_alerts(session, staff)
    assert all(alert["category"] != "REFUND" for alert in staff_alerts["items"])

    inventory = await session.get(Inventory, out_inventory.id)
    inventory.quantity = 10
    low_inventory.quantity = 10
    order.status = "PROCESSING"
    urgent_ticket.status = "RESOLVED"
    refund.status = "REFUNDED"
    await session.commit()

    resolved_alerts = await get_operation_alerts(session, owner)
    assert resolved_alerts["total"] == 0
