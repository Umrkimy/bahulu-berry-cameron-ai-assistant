from datetime import UTC, date, datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.reports import _csv_rows, summary_csv
from app.auth.dependencies import get_current_superuser
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.support import SupportRequest
from app.services.report_services import get_report_summary, resolve_report_range


def test_report_range_validation_and_presets():
    assert resolve_report_range(preset="LAST_7_DAYS", start_date=None, end_date=None, today=date(2026, 9, 7))[:2] == (date(2026, 9, 1), date(2026, 9, 7))
    assert resolve_report_range(preset="MONTH_TO_DATE", start_date=None, end_date=None, today=date(2026, 9, 7))[:2] == (date(2026, 9, 1), date(2026, 9, 7))
    assert resolve_report_range(preset="LAST_12_MONTHS", start_date=None, end_date=None, today=date(2026, 9, 7))[:2] == (date(2025, 10, 1), date(2026, 9, 7))
    with pytest.raises(HTTPException):
        resolve_report_range(preset=None, start_date=date(2026, 2, 2), end_date=date(2026, 2, 1))
    with pytest.raises(HTTPException):
        resolve_report_range(preset=None, start_date=date(2025, 1, 1), end_date=date(2026, 1, 2))


@pytest.mark.asyncio
async def test_owner_report_uses_historical_snapshots_and_safe_csv(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="test", role="OWNER", is_active=True)
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    product = Product(name="Fictional Berry Box", price=Decimal("20.00"), is_active=True)
    inactive_product = Product(name="Inactive", price=Decimal("20.00"), is_active=False)
    session.add_all([owner, customer, product, inactive_product])
    await session.flush()
    session.add_all([
        Inventory(product_id=product.id, quantity=2, low_stock_threshold=5),
        Inventory(product_id=inactive_product.id, quantity=0, low_stock_threshold=5),
    ])
    paid = Order(customer_id=customer.id, status="COMPLETED", payment_status="PAID", subtotal=Decimal("40.00"), discount_amount=Decimal("5.00"), total_amount=Decimal("35.00"), created_at=datetime(2026, 9, 2, 3, tzinfo=UTC))
    cancelled = Order(customer_id=customer.id, status="CANCELLED", payment_status="PAID", subtotal=Decimal("20.00"), discount_amount=Decimal("2.00"), total_amount=Decimal("18.00"), created_at=datetime(2026, 9, 3, 3, tzinfo=UTC))
    session.add_all([paid, cancelled])
    await session.flush()
    session.add_all([
        OrderItem(order_id=paid.id, product_id=product.id, quantity=2, unit_price=Decimal("20.00"), subtotal=Decimal("40.00"), discount_name="Fictional 10%", discount_type="PERCENTAGE", discount_value=Decimal("10.00"), discount_amount=Decimal("5.00"), total_amount=Decimal("35.00")),
        OrderItem(order_id=cancelled.id, product_id=product.id, quantity=1, unit_price=Decimal("20.00"), subtotal=Decimal("20.00"), discount_name="Cancelled promotion", discount_type="PERCENTAGE", discount_value=Decimal("10.00"), discount_amount=Decimal("2.00"), total_amount=Decimal("18.00")),
        SupportRequest(customer_name="Fictional Customer", subject="Fictional support", priority="HIGH", status="NEW", created_at=datetime(2026, 9, 2, 3, tzinfo=UTC)),
        SupportRequest(customer_name="Fictional Customer", subject="Resolved support", priority="NORMAL", status="RESOLVED", created_at=datetime(2026, 9, 3, 3, tzinfo=UTC)),
    ])
    await session.commit()

    report = await get_report_summary(session, preset=None, start_date=date(2026, 9, 2), end_date=date(2026, 9, 3))

    assert report["kpis"] == {
        "paid_revenue": Decimal("35.00"), "paid_order_count": 1, "total_orders_created": 2,
        "average_paid_order_value": Decimal("35.00"), "total_discount_granted": Decimal("5.00"),
    }
    assert [point["paid_order_count"] for point in report["daily_sales"]] == [1, 0]
    assert report["top_products"] == [{"product_id": product.id, "product_name": "Fictional Berry Box", "units_sold": 2, "final_line_total": Decimal("35.00")}]
    assert report["promotion_impact"] == [{"promotion_name": "Fictional 10%", "promotion_type": "PERCENTAGE", "affected_units": 2, "discount_amount": Decimal("5.00")}]
    assert report["inventory_health"]["low_stock_count"] == 1
    assert report["inventory_health"]["out_of_stock_count"] == 0
    assert report["support_workload"]["tickets_created"] == 2
    assert report["support_workload"]["current_open_high_priority_count"] == 1

    csv_values = "\n".join(",".join(str(value) for value in row) for row in _csv_rows(report)
    )
    assert "0123456789" not in csv_values
    assert "Fictional support" not in csv_values

    response = await summary_csv(session, owner, preset=None, start_date=date(2026, 9, 2), end_date=date(2026, 9, 3))
    activities = (await session.execute(select(ActivityLog))).scalars().all()
    assert response.headers["content-disposition"].startswith("attachment;")
    assert len(activities) == 1
    assert activities[0].entity_type == "report"


@pytest.mark.asyncio
async def test_owner_dependency_rejects_staff_reports():
    staff = Admin(username="staff", email="staff@example.test", password_hash="test", role="STAFF", is_active=True)
    with pytest.raises(HTTPException) as error:
        await get_current_superuser(staff)
    assert error.value.status_code == 403
