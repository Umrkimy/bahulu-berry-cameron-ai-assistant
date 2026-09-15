from decimal import Decimal

import pytest
from fastapi import HTTPException

from app.api.routes.customers import archive_customer, create_customer, get_customers, restore_customer
from app.auth.dependencies import get_current_superuser
from app.api.routes.products import create_product, delete_product
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.stock_movement import StockMovement
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.schemas.product import ProductCreate


async def create_owner(session):
    owner = Admin(username="retention-owner", email="owner@example.test", password_hash="unused", role="OWNER", is_active=True)
    session.add(owner)
    await session.commit()
    return owner


@pytest.mark.asyncio
async def test_customer_with_orders_is_archived_and_restored_without_losing_history(session):
    owner = await create_owner(session)
    customer = Customer(full_name="Fictional customer", phone_number="0000000000")
    session.add(customer)
    await session.flush()
    session.add(Order(customer_id=customer.id, total_amount=Decimal("10.00")))
    await session.commit()

    archived = await archive_customer(customer.id, session, owner)
    assert archived.is_archived is True
    assert archived.archived_at is not None
    assert await session.get(Order, 1) is not None

    assert await get_customers(session, owner, "active") == []
    assert [record.id for record in await get_customers(session, owner, "archived")] == [customer.id]

    restored = await restore_customer(customer.id, session, owner)
    assert restored.is_archived is False
    assert restored.archived_at is None


@pytest.mark.asyncio
async def test_product_with_order_or_stock_history_cannot_be_deleted(session):
    owner = await create_owner(session)
    customer = Customer(full_name="Fictional customer", phone_number="0000000000")
    product = Product(name="Fictional product", price=Decimal("10.00"))
    session.add_all([customer, product])
    await session.flush()
    inventory = Inventory(product_id=product.id, quantity=5, low_stock_threshold=1)
    session.add(inventory)
    await session.flush()
    order = Order(customer_id=customer.id, total_amount=Decimal("10.00"))
    session.add(order)
    await session.flush()
    session.add(OrderItem(order_id=order.id, product_id=product.id, quantity=1, unit_price=Decimal("10.00"), subtotal=Decimal("10.00"), total_amount=Decimal("10.00")))
    session.add(StockMovement(inventory_id=inventory.id, product_id=product.id, movement_type="ORDER_DEDUCTION", quantity_change=-1, quantity_before=5, quantity_after=4))
    await session.commit()

    with pytest.raises(HTTPException, match="stock-movement history") as error:
        await delete_product(product.id, session, owner)

    assert error.value.status_code == 409
    assert await session.get(Product, product.id) is not None


@pytest.mark.asyncio
async def test_customer_contact_normalisation_blocks_equivalent_active_and_archived_contacts(session):
    owner = await create_owner(session)
    created = await create_customer(CustomerCreate(full_name="First fictional customer", phone_number="012-345 6789", email=" First@Example.COM "), session, owner)
    assert created.phone_number == "+60123456789"
    assert str(created.email) == "first@example.com"

    with pytest.raises(HTTPException, match="phone number already exists") as duplicate_phone:
        await create_customer(CustomerCreate(full_name="Second fictional customer", phone_number="+60 12-345 6789"), session, owner)
    assert duplicate_phone.value.detail["field"] == "phone_number"

    await archive_customer(created.id, session, owner)
    with pytest.raises(HTTPException, match="email already exists") as duplicate_email:
        await create_customer(CustomerCreate(full_name="Third fictional customer", phone_number="013-345 6789", email="FIRST@example.com"), session, owner)
    assert duplicate_email.value.detail["field"] == "email"


@pytest.mark.asyncio
async def test_customer_contact_validation_and_staff_archive_protection(session):
    owner = await create_owner(session)
    customer = await create_customer(CustomerCreate(full_name="Fictional customer", phone_number="0123456789"), session, owner)
    with pytest.raises(HTTPException) as invalid:
        await create_customer(CustomerCreate(full_name="Invalid", phone_number="60123456789"), session, owner)
    assert invalid.value.status_code == 422
    assert invalid.value.detail["field"] == "phone_number"

    staff = Admin(username="retention-staff", email="staff@example.test", password_hash="unused", role="STAFF", is_active=True)
    session.add(staff)
    await session.commit()
    with pytest.raises(HTTPException) as forbidden:
        await get_current_superuser(staff)
    assert forbidden.value.status_code == 403


@pytest.mark.asyncio
async def test_product_creation_records_nonzero_opening_stock_in_ledger(session):
    owner = await create_owner(session)

    product = await create_product(
        ProductCreate(name="Ledger-backed product", price=Decimal("10.00"), initial_quantity=8),
        session,
        owner,
    )

    movement = await session.get(StockMovement, 1)
    assert product.inventory.quantity == 8
    assert movement is not None
    assert (movement.movement_type, movement.quantity_before, movement.quantity_change, movement.quantity_after) == (
        "OPENING_BALANCE",
        0,
        8,
        8,
    )
