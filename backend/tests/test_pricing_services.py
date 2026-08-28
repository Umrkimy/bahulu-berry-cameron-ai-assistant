from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.database import Base
from app.models.discount import Discount
from app.models.customer import Customer
from app.models.inventory import Inventory
from app.models.product import Product
from app.services.pricing_services import calculate_order_pricing
from app.schemas.discount import DiscountCreate
from app.services.discount_services import create_discount
from app.services.order_services import create_order


@pytest_asyncio.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as database_session:
        yield database_session

    await engine.dispose()


async def create_product(session, name: str, price: str):
    product = Product(name=name, price=Decimal(price), is_active=True)
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=20, low_stock_threshold=5))
    return product


async def test_quote_applies_percentage_discount(session):
    product = await create_product(session, "Chocolate Bahulu", "10.00")
    now = datetime.now(UTC)
    session.add(
        Discount(
            product_id=product.id,
            name="Chocolate Sale",
            discount_type="PERCENTAGE",
            discount_value=Decimal("10.00"),
            start_at=now - timedelta(minutes=1),
            end_at=now + timedelta(days=1),
            is_active=True,
        )
    )
    await session.commit()

    quote = await calculate_order_pricing(
        session,
        [{"product_id": product.id, "quantity": 2}],
    )

    assert quote["subtotal"] == Decimal("20.00")
    assert quote["discount_amount"] == Decimal("2.00")
    assert quote["total_amount"] == Decimal("18.00")


async def test_quote_limits_fixed_discount_to_line_total(session):
    product = await create_product(session, "Original Bahulu", "5.00")
    now = datetime.now(UTC)
    session.add(
        Discount(
            product_id=product.id,
            name="Large Fixed Sale",
            discount_type="FIXED_AMOUNT",
            discount_value=Decimal("8.00"),
            start_at=now - timedelta(minutes=1),
            end_at=now + timedelta(days=1),
            is_active=True,
        )
    )
    await session.commit()

    quote = await calculate_order_pricing(
        session,
        [{"product_id": product.id, "quantity": 1}],
    )

    assert quote["discount_amount"] == Decimal("5.00")
    assert quote["total_amount"] == Decimal("0.00")


async def test_quote_ignores_expired_discount(session):
    product = await create_product(session, "Strawberry Bahulu", "12.00")
    now = datetime.now(UTC)
    session.add(
        Discount(
            product_id=product.id,
            name="Expired Sale",
            discount_type="PERCENTAGE",
            discount_value=Decimal("25.00"),
            start_at=now - timedelta(days=2),
            end_at=now - timedelta(days=1),
            is_active=True,
        )
    )
    await session.commit()

    quote = await calculate_order_pricing(
        session,
        [{"product_id": product.id, "quantity": 1}],
    )

    assert quote["discount_amount"] == Decimal("0.00")
    assert quote["total_amount"] == Decimal("12.00")


async def test_quote_applies_bundle_price_repeatedly(session):
    product = await create_product(session, "Bundle Bahulu", "10.00")
    now = datetime.now(UTC)
    session.add(
        Discount(
            product_id=product.id,
            name="Buy 3 for RM25",
            discount_type="BUNDLE_PRICE",
            discount_value=Decimal("25.00"),
            bundle_quantity=3,
            start_at=now - timedelta(minutes=1),
            end_at=now + timedelta(days=1),
            is_active=True,
        )
    )
    await session.commit()

    quote = await calculate_order_pricing(
        session,
        [{"product_id": product.id, "quantity": 7}],
    )

    assert quote["subtotal"] == Decimal("70.00")
    assert quote["discount_amount"] == Decimal("10.00")
    assert quote["total_amount"] == Decimal("60.00")
    assert quote["items"][0]["discount_bundle_quantity"] == 3


async def test_bundle_price_wins_over_percentage_by_default(session):
    product = await create_product(session, "Pandan Bahulu", "10.00")
    now = datetime.now(UTC)

    await create_discount(
        session,
        DiscountCreate(
            product_id=product.id,
            name="Buy 3 for RM25",
            discount_type="BUNDLE_PRICE",
            discount_value=Decimal("25.00"),
            bundle_quantity=3,
            start_at=now,
            end_at=now + timedelta(days=2),
            is_active=True,
        ),
    )

    await create_discount(
        session,
        DiscountCreate(
            product_id=product.id,
            name="10% extra off",
            discount_type="PERCENTAGE",
            discount_value=Decimal("10.00"),
            start_at=now,
            end_at=now + timedelta(days=3),
            is_active=True,
        ),
    )

    quote = await calculate_order_pricing(session, [{"product_id": product.id, "quantity": 3}])
    assert quote["total_amount"] == Decimal("25.00")
    assert quote["items"][0]["discount_name"] == "Buy 3 for RM25"


async def test_percentage_can_stack_when_admin_enables_it(session):
    product = await create_product(session, "Strawberry Bahulu", "10.00")
    now = datetime.now(UTC)
    session.add_all([
        Discount(product_id=product.id, name="Buy 3 for RM25", discount_type="BUNDLE_PRICE", discount_value=Decimal("25.00"), bundle_quantity=3, start_at=now - timedelta(minutes=1), end_at=now + timedelta(days=1), is_active=True),
        Discount(product_id=product.id, name="10% extra off", discount_type="PERCENTAGE", discount_value=Decimal("10.00"), stack_with_bundle=True, start_at=now - timedelta(minutes=1), end_at=now + timedelta(days=1), is_active=True),
    ])
    await session.commit()

    quote = await calculate_order_pricing(session, [{"product_id": product.id, "quantity": 3}])
    assert quote["total_amount"] == Decimal("22.50")


async def test_order_keeps_discount_snapshot_after_promotion_changes(session):
    product = await create_product(session, "Original Bahulu", "10.00")
    customer = Customer(full_name="Umar", phone_number="0123456789")
    session.add(customer)
    await session.flush()
    now = datetime.now(UTC)

    discount = Discount(
        product_id=product.id,
        name="Opening Sale",
        discount_type="PERCENTAGE",
        discount_value=Decimal("20.00"),
        start_at=now - timedelta(minutes=1),
        end_at=now + timedelta(days=1),
        is_active=True,
    )
    session.add(discount)
    await session.commit()

    result = await create_order(
        session,
        customer.id,
        [{"product_id": product.id, "quantity": 2}],
    )

    assert result["success"] is True
    assert result["order"]["subtotal"] == 20.0
    assert result["order"]["discount_amount"] == 4.0
    assert result["order"]["total_amount"] == 16.0
    assert result["order"]["items"][0]["discount_name"] == "Opening Sale"

    product.price = Decimal("15.00")
    discount.name = "Changed Promotion"
    discount.discount_value = Decimal("5.00")
    await session.commit()

    assert result["order"]["total_amount"] == 16.0
    assert result["order"]["items"][0]["discount_name"] == "Opening Sale"
