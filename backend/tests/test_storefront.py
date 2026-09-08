from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.storefront import get_storefront_product, list_storefront_products
from app.models.discount import Discount
from app.models.inventory import Inventory
from app.models.product import Product


def request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/api/storefront/products", "headers": [], "client": ("127.0.0.1", 1234)})


@pytest.mark.asyncio
async def test_storefront_only_returns_published_safe_product_fields(session):
    product = Product(
        name="Internal product name",
        price=Decimal("12.00"),
        is_active=True,
        storefront_published=True,
        storefront_name_en="Approved English name",
        storefront_name_ms="Nama Bahasa Melayu diluluskan",
        storefront_description_en="Approved English description",
        storefront_description_ms="Penerangan Bahasa Melayu diluluskan",
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
    assert response.headers["cache-control"] == "public, max-age=60, stale-while-revalidate=300"


@pytest.mark.asyncio
async def test_storefront_hides_out_of_stock_quantity_and_unavailable_products(session):
    product = Product(
        name="Unavailable product",
        price=Decimal("9.00"),
        is_active=True,
        storefront_published=True,
        storefront_name_en="Unavailable English",
        storefront_name_ms="Tidak tersedia",
    )
    session.add(product)
    await session.flush()
    session.add(Inventory(product_id=product.id, quantity=0, low_stock_threshold=1))
    await session.commit()

    item = await get_storefront_product(product.id, request(), session, Response())

    assert item.is_available is False
    assert "quantity" not in item.model_dump()
