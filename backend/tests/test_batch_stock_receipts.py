from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy import select

from app.api.routes.inventories import get_stock_movements, receive_stock_receipt
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.models.supplier import Supplier
from app.schemas.inventory import BatchStockReceiptCreate


async def receipt_fixture(session):
    owner = Admin(username="receipt-owner", email="receipt-owner@example.test", password_hash="x", role="OWNER", is_active=True)
    staff = Admin(username="receipt-staff", email="receipt-staff@example.test", password_hash="x", role="STAFF", is_active=True)
    supplier = Supplier(name="Fictional Supplier", is_active=True)
    inactive_supplier = Supplier(name="Inactive Supplier", is_active=False)
    products = [Product(name="Fictional Original", price=Decimal("10.00")), Product(name="Fictional Strawberry", price=Decimal("12.00"))]
    session.add_all([owner, staff, supplier, inactive_supplier, *products])
    await session.flush()
    inventories = [Inventory(product_id=product.id, quantity=index + 2, low_stock_threshold=1) for index, product in enumerate(products)]
    session.add_all(inventories)
    await session.commit()
    return owner, staff, supplier, inactive_supplier, inventories


@pytest.mark.asyncio
async def test_batch_receipt_is_atomic_and_records_shared_metadata(session):
    owner, staff, supplier, _, inventories = await receipt_fixture(session)
    result = await receive_stock_receipt(
        BatchStockReceiptCreate(supplier_id=supplier.id, reference="DN-100", items=[{"inventory_id": inventories[0].id, "quantity": 5}, {"inventory_id": inventories[1].id, "quantity": 3}]),
        session,
        staff,
    )
    assert result.received_count == 2
    assert [item.quantity for item in result.inventories] == [7, 6]
    movements = (await session.scalars(select(StockMovement).order_by(StockMovement.inventory_id))).all()
    assert [(item.movement_type, item.supplier_id, item.reference, item.admin_id) for item in movements] == [("SUPPLIER_RECEIPT", supplier.id, "DN-100", staff.id), ("SUPPLIER_RECEIPT", supplier.id, "DN-100", staff.id)]
    activity = await session.scalar(select(ActivityLog).where(ActivityLog.action == "stock_received"))
    assert activity is not None and "DN-100" in activity.description and owner.role == "OWNER"


@pytest.mark.asyncio
async def test_batch_receipt_rejects_invalid_supplier_duplicates_and_rolls_back(session):
    owner, _, supplier, inactive_supplier, inventories = await receipt_fixture(session)
    with pytest.raises(HTTPException, match="active supplier"):
        await receive_stock_receipt(BatchStockReceiptCreate(supplier_id=inactive_supplier.id, reference="DN-101", items=[{"inventory_id": inventories[0].id, "quantity": 1}]), session, owner)
    with pytest.raises(HTTPException, match="delivery-note"):
        await receive_stock_receipt(BatchStockReceiptCreate(supplier_id=supplier.id, reference="  ", items=[{"inventory_id": inventories[0].id, "quantity": 1}]), session, owner)
    with pytest.raises(HTTPException, match="only once"):
        await receive_stock_receipt(BatchStockReceiptCreate(supplier_id=supplier.id, reference="DN-101", items=[{"inventory_id": inventories[0].id, "quantity": 1}, {"inventory_id": inventories[0].id, "quantity": 1}]), session, owner)
    with pytest.raises(HTTPException, match="no longer exist"):
        await receive_stock_receipt(BatchStockReceiptCreate(supplier_id=supplier.id, reference="DN-101", items=[{"inventory_id": inventories[0].id, "quantity": 1}, {"inventory_id": 99999, "quantity": 1}]), session, owner)
    await session.refresh(inventories[0])
    assert inventories[0].quantity == 2
    assert await session.scalar(select(StockMovement.id)) is None


def test_batch_receipt_schema_requires_a_reference_and_positive_line_quantities():
    with pytest.raises(ValidationError):
        BatchStockReceiptCreate(supplier_id=1, reference="", items=[{"inventory_id": 1, "quantity": 1}])
    with pytest.raises(ValidationError):
        BatchStockReceiptCreate(supplier_id=1, reference="DN-102", items=[{"inventory_id": 1, "quantity": 0}])


@pytest.mark.asyncio
async def test_stock_history_search_matches_supplier_and_reference(session):
    owner, _, supplier, _, inventories = await receipt_fixture(session)
    await receive_stock_receipt(BatchStockReceiptCreate(supplier_id=supplier.id, reference="INV-2026-01", items=[{"inventory_id": inventories[0].id, "quantity": 1}]), session, owner)
    by_reference = await get_stock_movements(session, owner, search="2026-01", page=1, page_size=20)
    by_supplier = await get_stock_movements(session, owner, search="fictional supplier", page=1, page_size=20)
    assert by_reference.total == by_supplier.total == 1
