from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.storefront import get_storefront_product, list_storefront_products, quote_storefront_cart
from app.models.discount import Discount
from app.models.inventory import Inventory
from app.models.product import Product
from app.services.pricing_services import calculate_order_pricing
from app.schemas.storefront import StorefrontQuoteRequest


def request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/api/storefront/products", "headers": [], "client": ("127.0.0.1", 1234)})


@pytest.mark.asyncio
async def test_storefront_only_returns_published_safe_product_fields(session):
    product = Product(
        name="Approved English name",
        description="Approved English description",
        price=Decimal("12.00"),
        is_active=True,
        storefront_published=True,
        name_ms="Nama Bahasa Melayu diluluskan",
        description_ms="Penerangan Bahasa Melayu diluluskan",
    )
    hidden = Product(name="Hidden", price=Decimal("8.00"), is_active=True, storefront_published=False)
    session.add_all([product, hidden])
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=4, low_stock_threshold=1))
    session.add(Inventory(product_id=hidden.id, quantity=99, low_stock_threshold=1))
    session.add(Discount(
        product_id=product.id,
        name="Internal promotion label",
        discount_type="PERCENTAGE",
        discount_value=Decimal("10.00"),
        start_at=datetime.now(UTC) - timedelta(hours=1),
        end_at=datetime.now(UTC) + timedelta(hours=1),
        is_active=True,
    ))
    await session.commit()

    response = Response()
    page = await list_storefront_products(request(), session, response, search=None, category=None, page=1, page_size=24)

    assert page.total == 1
    item = page.items[0].model_dump()
    assert item["name_en"] == "Approved English name"
    assert item["sale_price"] == Decimal("10.80")
    assert item["is_available"] is True
    assert "inventory" not in item
    assert "id" not in item["promotions"][0]
    assert item["promotions"][0]["label"] == "10.00% off"
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_storefront_hides_out_of_stock_quantity_and_unavailable_products(session):
    product = Product(
        name="Unavailable product",
        price=Decimal("9.00"),
        is_active=True,
        storefront_published=True,
        name_ms="Tidak tersedia",
    )
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=0, low_stock_threshold=1))
    await session.commit()

    item = await get_storefront_product(product.id, request(), session, Response())

    assert item.is_available is False
    assert "quantity" not in item.model_dump()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "price,discounts,expected",
    [
        ("10.00", [("FIXED_AMOUNT", "2.00"), ("PERCENTAGE", "10.00")], "7.00"),
        ("0.05", [("PERCENTAGE", "10.00")], "0.04"),
    ],
)
async def test_storefront_sale_price_matches_single_unit_order(session, price, discounts, expected):
    product = Product(
        name="Fictional pricing fixture", price=Decimal(price), is_active=True,
        storefront_published=True, name_ms="Produk fiksyen",
    )
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=10, low_stock_threshold=1))
    for discount_type, value in discounts:
        session.add(Discount(
            product_id=product.id, name="Fictional discount", discount_type=discount_type,
            discount_value=Decimal(value), start_at=datetime.now(UTC) - timedelta(hours=1),
            end_at=datetime.now(UTC) + timedelta(hours=1), is_active=True,
        ))
    await session.commit()

    item = await get_storefront_product(product.id, request(), session, Response())
    quote = await calculate_order_pricing(session, [{"product_id": product.id, "quantity": 1}])

    assert quote["total_amount"] == Decimal(expected)
    assert item.sale_price == quote["total_amount"]


@pytest.mark.asyncio
async def test_storefront_quote_is_authoritative_public_and_read_only(session):
    product = Product(
        name="Approved quote product", price=Decimal("20.00"), is_active=True,
        storefront_published=True, name_ms="Produk sebut harga diluluskan",
    )
    session.add(product)
    await session.flush()
    inventory = Inventory(product_id=product.id, quantity=5, low_stock_threshold=1)
    session.add(inventory)
    session.add(Discount(
        product_id=product.id, name="Internal promotion name", discount_type="PERCENTAGE",
        discount_value=Decimal("10.00"), start_at=datetime.now(UTC) - timedelta(hours=1),
        end_at=datetime.now(UTC) + timedelta(hours=1), is_active=True,
    ))
    await session.commit()

    response = Response()
    quote = await quote_storefront_cart(
        StorefrontQuoteRequest(items=[{"product_id": product.id, "quantity": 2}]),
        request(), session, response,
    )

    assert quote.ready is True
    assert quote.total_amount == Decimal("36.00")
    assert quote.items[0].name_en == "Approved quote product"
    assert quote.items[0].discount_amount == Decimal("4.00")
    assert "Internal promotion" not in str(quote.model_dump())
    assert response.headers["cache-control"] == "no-store"
    await session.refresh(inventory)
    assert inventory.quantity == 5


@pytest.mark.asyncio
async def test_storefront_quote_returns_safe_stale_and_quantity_states(session):
    visible = Product(
        name="Visible product", price=Decimal("9.00"), is_active=True,
        storefront_published=True, name_ms="Produk kelihatan",
    )
    hidden = Product(name="Hidden internal name", price=Decimal("8.00"), is_active=True, storefront_published=False)
    session.add_all([visible, hidden])
    await session.flush()
    session.add_all([
        Inventory(product_id=visible.id, quantity=1, low_stock_threshold=1),
        Inventory(product_id=hidden.id, quantity=20, low_stock_threshold=1),
    ])
    await session.commit()

    quote = await quote_storefront_cart(
        StorefrontQuoteRequest(items=[
            {"product_id": visible.id, "quantity": 2},
            {"product_id": hidden.id, "quantity": 1},
            {"product_id": 2147483647, "quantity": 1},
        ]),
        request(), session, Response(),
    )

    assert quote.ready is False
    assert quote.subtotal is None and quote.total_amount is None
    assert [item.status for item in quote.items] == ["QUANTITY_UNAVAILABLE", "NOT_AVAILABLE", "NOT_AVAILABLE"]
    assert quote.items[0].name_en == "Visible product"
    assert quote.items[1].name_en is None
    assert "Hidden internal name" not in str(quote.model_dump())
