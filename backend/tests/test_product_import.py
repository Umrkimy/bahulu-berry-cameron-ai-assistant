from io import BytesIO

import pytest
from fastapi import HTTPException, UploadFile
from sqlalchemy import func, select

from app.api.routes.products import import_products, preview_product_import
from app.auth.dependencies import get_current_superuser
from app.models import ActivityLog, Admin, Inventory, Product


def upload_csv(text: str, filename: str = "products.csv") -> UploadFile:
    return UploadFile(filename=filename, file=BytesIO(text.encode("utf-8")))


def product_csv(*rows: str) -> UploadFile:
    return upload_csv("name,category,description,price_myr,opening_stock,low_stock_threshold\n" + "\n".join(rows) + "\n")


async def owner(session) -> Admin:
    item = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(item)
    await session.commit()
    return item


async def test_preview_validates_without_writing_and_uses_default_threshold(session):
    current_owner = await owner(session)
    preview = await preview_product_import(
        product_csv("Original Bahulu,Bahulu,Freshly made,12.50,24,"), session, current_owner
    )

    assert preview.can_import is True
    assert preview.rows[0].low_stock_threshold == 10
    assert await session.scalar(select(func.count()).select_from(Product)) == 0


async def test_preview_rejects_duplicate_and_invalid_rows(session):
    current_owner = await owner(session)
    preview = await preview_product_import(
        product_csv("Original Bahulu,Bahulu,,12.50,24,10", "original bahulu,Bahulu,,RM 9.00,1,ten"), session, current_owner
    )

    assert preview.can_import is False
    assert {issue.field for issue in preview.errors} >= {"name", "price_myr", "low_stock_threshold"}
    assert await session.scalar(select(func.count()).select_from(Product)) == 0


async def test_preview_rejects_existing_names_and_bad_headers(session):
    current_owner = await owner(session)
    session.add(Product(name="Original Bahulu", price="12.50", is_active=True))
    await session.commit()

    existing = await preview_product_import(product_csv("Original Bahulu,Bahulu,,12.50,24,10"), session, current_owner)
    assert existing.can_import is False
    assert any("already exists" in issue.message for issue in existing.errors)

    with pytest.raises(HTTPException, match="template headers"):
        await preview_product_import(upload_csv("Name,Price\nTest,12.50\n"), session, current_owner)


async def test_confirmed_import_creates_products_inventory_and_one_audit_entry(session):
    current_owner = await owner(session)
    result = await import_products(
        product_csv("Original Bahulu,Bahulu,Freshly made,12.50,24,5", "Strawberry Bahulu,Bahulu,,15.00,12,"),
        session,
        current_owner,
    )

    products = (await session.scalars(select(Product).order_by(Product.name))).all()
    inventories = (await session.scalars(select(Inventory).order_by(Inventory.product_id))).all()
    activities = (await session.scalars(select(ActivityLog).where(ActivityLog.action == "imported"))).all()
    assert result.imported_count == 2
    assert [product.storefront_published for product in products] == [False, False]
    assert [inventory.quantity for inventory in inventories] == [24, 12]
    assert [inventory.low_stock_threshold for inventory in inventories] == [5, 10]
    assert len(activities) == 1
    assert activities[0].description == "Imported 2 products from CSV."


async def test_import_rejects_non_csv_and_staff_are_denied(session):
    current_owner = await owner(session)
    with pytest.raises(HTTPException, match="Choose a .csv"):
        await preview_product_import(upload_csv("ignored", "products.txt"), session, current_owner)

    staff = Admin(username="staff", email="staff@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    with pytest.raises(HTTPException) as error:
        await get_current_superuser(staff)
    assert error.value.status_code == 403
