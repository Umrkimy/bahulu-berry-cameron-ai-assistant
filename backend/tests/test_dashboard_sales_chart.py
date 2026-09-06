from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.api.routes.dashboard import sales_chart
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.order import Order


@pytest.mark.asyncio
async def test_dashboard_sales_chart_returns_twelve_months_and_excludes_cancelled_orders(session):
    admin = Admin(username="owner", email="owner@example.test", password_hash="test", role="OWNER", is_active=True)
    customer = Customer(full_name="Fictional Customer", phone_number="0123456789")
    session.add_all([admin, customer])
    await session.flush()
    now = datetime.now(UTC)
    session.add_all([
        Order(customer_id=customer.id, status="COMPLETED", payment_status="PAID", total_amount=Decimal("20.00"), created_at=now),
        Order(customer_id=customer.id, status="CANCELLED", payment_status="PAID", total_amount=Decimal("99.00"), created_at=now),
        Order(customer_id=customer.id, status="PENDING", payment_status="UNPAID", total_amount=Decimal("50.00"), created_at=now),
    ])
    await session.commit()

    result = await sales_chart(session, admin)

    assert len(result) == 12
    assert sum(item["revenue"] for item in result) == Decimal("20.00")
