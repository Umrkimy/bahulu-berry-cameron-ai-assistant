from decimal import Decimal

import pytest
from sqlalchemy import select

from app.models.inventory import Inventory
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier  # noqa: F401
from app.services.inventory_services import adjust_inventory


@pytest.mark.asyncio
async def test_inventory_adjustment_creates_matching_ledger_entry(session):
    product = Product(name="Ledger Test Bahulu", price=Decimal("10.00"), is_active=True)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=10, low_stock_threshold=2))
    await session.commit()

    await adjust_inventory(session, product.id, -3, movement_type="MANUAL_DECREASE", reason="Damaged stock")
    await session.commit()

    movement = await session.scalar(select(StockMovement))
    inventory = await session.scalar(select(Inventory).where(Inventory.product_id == product.id))
    assert inventory.quantity == 7
    assert movement is not None
    assert movement.movement_type == "MANUAL_DECREASE"
    assert (movement.quantity_change, movement.quantity_before, movement.quantity_after) == (-3, 10, 7)


@pytest.mark.asyncio
async def test_inventory_adjustment_cannot_go_negative_or_create_movement(session):
    product = Product(name="Zero Test Bahulu", price=Decimal("10.00"), is_active=True)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=1, low_stock_threshold=1))
    await session.commit()

    with pytest.raises(Exception):
        await adjust_inventory(session, product.id, -2, movement_type="MANUAL_DECREASE", reason="Damaged stock")
    assert await session.scalar(select(StockMovement)) is None
