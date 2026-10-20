from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models import Customer, Delivery, Inventory, Order, OrderItem, Product
from app.services.delivery_services import update_delivery
from app.services.order_services import cancel_order


async def test_cancelling_an_order_cancels_its_delivery(session):
    customer = Customer(full_name="Aina Fictional", phone_number="+60100000011", canonical_phone_number="+60100000011")
    product = Product(name="Fictional Berry Bahulu", price=Decimal("10.00"), category="Test", is_active=True)
    session.add_all([customer, product])
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=5, low_stock_threshold=1))
    order = Order(customer_id=customer.id, status="PENDING", payment_status="UNPAID", subtotal=Decimal("10.00"), total_amount=Decimal("10.00"))
    session.add(order)
    await session.flush()
    session.add_all([
        OrderItem(order_id=order.id, product_id=product.id, quantity=1, unit_price=Decimal("10.00"), subtotal=Decimal("10.00"), total_amount=Decimal("10.00")),
        Delivery(order_id=order.id, recipient_name="Aina Fictional", status="PENDING"),
    ])
    await session.commit()

    assert (await cancel_order(session, order.id))["success"] is True
    await session.commit()

    delivery = await session.scalar(select(Delivery).where(Delivery.order_id == order.id))
    assert delivery.status == "CANCELLED"
    with pytest.raises(ValueError):
        await update_delivery(session, order.id, {"status": "SHIPPED"})
