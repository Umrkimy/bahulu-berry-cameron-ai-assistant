from io import BytesIO
import asyncio

import httpx
import pytest
from fastapi import FastAPI, HTTPException, UploadFile
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.api.routes import products, product_images, storefront
from app.auth.dependencies import get_current_admin
from app.core.config import settings
from app.core.static_assets import PublicStaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.db.database import get_db
from app.models import Admin, Inventory, Product, StorefrontFeature
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.product_media import MAX_UPLOAD, media_path, save_image


def photo(color="red", format="PNG", size=(60, 90)):
    output = BytesIO()
    Image.new("RGB", size, color).save(output, format)
    return output.getvalue()


@pytest.fixture
async def client(session, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PRODUCT_MEDIA_DIRECTORY", str(tmp_path))
    owner = Admin(username="gallery-owner", email="gallery@example.test", password_hash="unused", role="OWNER")
    session.add_all([owner, StorefrontFeature(id=1)])
    await session.commit()
    app = FastAPI()
    app.include_router(product_images.router, prefix="/api/products")
    app.include_router(products.router, prefix="/api/products")
    app.include_router(storefront.router, prefix="/api/storefront")
    async def database():
        yield session
    app.dependency_overrides[get_db] = database
    app.dependency_overrides[get_current_admin] = lambda: owner
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        client.owner = owner
        yield client


async def create(client, name="Fictional gallery product"):
    response = await client.post("/api/products/", json={"name": name, "price": "12.00", "initial_quantity": 3})
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def publish(client, product_id):
    response = await client.patch(f"/api/products/{product_id}", json={"storefront_name_en": "Fictional gallery", "storefront_name_ms": "Galeri fiksyen", "storefront_published": True})
    assert response.status_code == 200, response.text


async def upload(client, product_id, data=None):
    response = await client.post(f"/api/products/{product_id}/images", files={"file": ("photo.png", data or photo(), "image/png")})
    assert response.status_code == 201, response.text
    return response.json()


async def test_full_gallery_publish_feature_and_reload_workflow(client, session):
    pid = await create(client)
    first = await upload(client, pid)
    second = await upload(client, pid, photo("blue"))
    public_first = f"/api/storefront/products/{pid}/images/{first['id']}/content"
    assert (await client.get(public_first)).status_code == 404
    assert (await client.put(f"/api/products/{pid}/feature")).status_code == 422
    await publish(client, pid)
    assert (await client.put(f"/api/products/{pid}/feature")).status_code == 200
    result = await client.get("/api/storefront/featured")
    assert result.json()["id"] == pid
    assert result.headers["cache-control"] == "no-store"
    image_response = await client.get(public_first)
    assert image_response.headers["content-type"] == "image/webp"
    original = image_response.content
    assert Image.open(BytesIO(original)).format == "WEBP"
    assert (await client.put(f"/api/products/{pid}/images", json={"image_ids": [second['id'], first['id']]})).status_code == 200
    assert (await client.get(f"/api/storefront/products/{pid}")).json()["images"][0]["id"] == second["id"]
    assert (await client.put(f"/api/products/{pid}/images/{first['id']}", files={"file": ("replacement.jpg", photo("green", "JPEG"))})).status_code == 200
    assert (await client.get(public_first)).content != original
    assert (await client.patch(f"/api/products/{pid}", json={"price": "18.00", "storefront_description_en": "Fictional updated description"})).status_code == 200
    inventory = await session.scalar(select(Inventory).where(Inventory.product_id == pid))
    inventory.quantity = 0
    await session.commit()
    product = (await client.get(f"/api/storefront/products/{pid}")).json()
    assert product["price"] == "18.00" and not product["is_available"]
    assert product["description_en"] == "Fictional updated description"
    await client.patch(f"/api/products/{pid}", json={"storefront_published": False})
    assert (await client.get(public_first)).status_code == 404
    assert (await client.get("/api/storefront/featured")).json() is None
    await publish(client, pid)
    await client.patch(f"/api/products/{pid}", json={"is_active": False})
    assert (await client.get(public_first)).status_code == 404
    await client.patch(f"/api/products/{pid}", json={"is_active": True})
    for image in [first, second]:
        assert (await client.delete(f"/api/products/{pid}/images/{image['id']}")).status_code == 204
    assert (await client.get("/api/storefront/featured")).json() is None


async def test_gallery_limits_invalid_order_and_owner_permissions(client):
    pid = await create(client)
    images = [await upload(client, pid) for _ in range(6)]
    assert (await client.post(f"/api/products/{pid}/images", files={"file": ("extra.png", photo())})).status_code == 422
    assert (await client.put(f"/api/products/{pid}/images", json={"image_ids": [images[0]["id"]] * 6})).status_code == 409
    assert (await client.delete(f"/api/products/{pid + 1}/images/{images[0]['id']}")).status_code == 404
    client.owner.role = "STAFF"
    assert (await client.post(f"/api/products/{pid}/images", files={"file": ("photo.png", photo())})).status_code == 403
    assert (await client.put(f"/api/products/{pid}/feature")).status_code == 403
    assert (await client.delete(f"/api/products/{pid}/images/{images[0]['id']}")).status_code == 403


@pytest.mark.parametrize("data", [b"not an image", b"x" * (MAX_UPLOAD + 1), photo(size=(5000, 4001))], ids=["corrupt", "oversized-file", "oversized-dimensions"])
def test_invalid_images_rejected(data, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PRODUCT_MEDIA_DIRECTORY", str(tmp_path))
    with pytest.raises(HTTPException):
        save_image(data)
    assert not list(tmp_path.iterdir())


def test_animation_and_path_traversal_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PRODUCT_MEDIA_DIRECTORY", str(tmp_path))
    output = BytesIO()
    Image.new("RGB", (10, 10), "red").save(output, "PNG", save_all=True, append_images=[Image.new("RGB", (10, 10), "blue")], duration=100)
    with pytest.raises(HTTPException):
        save_image(output.getvalue())
    with pytest.raises(HTTPException):
        media_path("../outside.png")


@pytest.mark.parametrize("values", [{"name": "   "}, {"price": "-1"}, {"price": "0"}, {"price": "123456789.00"}])
def test_create_and_update_validation_agree(values):
    with pytest.raises(ValueError):
        ProductCreate.model_validate({"name": "Fictional", "price": "12", **values})
    with pytest.raises(ValueError):
        ProductUpdate.model_validate(values)


async def test_all_product_pages_and_no_stale_price(client, session):
    session.add_all([Product(name=f"Fictional {i:03}", price=12, is_active=True, storefront_published=True, storefront_name_en=f"Fictional {i:03}", storefront_name_ms=f"Fiksyen {i:03}") for i in range(55)])
    await session.commit()
    admin = (await client.get("/api/products/admin?page=2&page_size=20")).json()
    assert len(admin["items"]) == 20 and admin["total"] == 55
    public = (await client.get("/api/storefront/products?page=2&page_size=48")).json()
    assert len(public["items"]) == 7 and public["total"] == 55


async def test_delete_uses_product_foreign_key_not_inventory_primary_key(client, session):
    first = Product(id=201, name="Fictional retained", price=12)
    second = Product(id=202, name="Fictional removable", price=12)
    session.add_all([first, second])
    await session.flush()
    session.add_all([Inventory(id=202, product_id=201, quantity=0, low_stock_threshold=1), Inventory(id=203, product_id=202, quantity=0, low_stock_threshold=1)])
    await session.commit()
    assert (await client.delete("/api/products/202")).status_code == 204
    assert await session.get(Inventory, 202) is not None
    assert await session.get(Inventory, 203) is None


async def test_failed_upload_preserves_gallery(client, monkeypatch):
    pid = await create(client)
    first = await upload(client, pid)
    def unavailable(_):
        raise HTTPException(503, "Media storage unavailable.")
    monkeypatch.setattr(product_images, "save_image", unavailable)
    response = await client.put(f"/api/products/{pid}/images/{first['id']}", files={"file": ("photo.png", photo())})
    assert response.status_code == 503
    assert (await client.get(first["image_path"])).status_code == 200


def test_upload_corrects_orientation_and_strips_metadata(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "PRODUCT_MEDIA_DIRECTORY", str(tmp_path))
    output = BytesIO()
    source = Image.new("RGB", (80, 40), "green")
    exif = source.getexif()
    exif[274] = 6
    exif[270] = "private camera metadata"
    source.save(output, "JPEG", exif=exif)
    saved = Image.open(media_path(save_image(output.getvalue())))
    assert saved.size == (40, 80)
    assert not saved.getexif()


async def test_concurrent_uploads_cannot_exceed_gallery_limit(client, session):
    if session.bind.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    pid = await create(client)
    for _ in range(5):
        await upload(client, pid)
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    async def attempt():
        async with factory() as db:
            try:
                await product_images.upload_image(pid, UploadFile(file=BytesIO(photo()), filename="photo.png"), db, client.owner)
                return 201
            except HTTPException as error:
                return error.status_code
    assert sorted(await asyncio.gather(attempt(), attempt())) == [201, 422]


async def test_concurrent_feature_selection_has_one_winner(client, session):
    if session.bind.dialect.name != "postgresql":
        pytest.skip("Requires PostgreSQL row locks")
    ids = [await create(client, f"Fictional selection {i}") for i in range(2)]
    for pid in ids:
        await upload(client, pid)
        await publish(client, pid)
    factory = async_sessionmaker(session.bind, expire_on_commit=False)
    async def choose(pid):
        async with factory() as db:
            await product_images.feature_product(pid, db, client.owner)
    await asyncio.gather(*(choose(pid) for pid in ids))
    async with factory() as db:
        rows = (await db.scalars(select(StorefrontFeature))).all()
        assert len(rows) == 1 and rows[0].product_id in ids


async def test_legacy_static_url_cannot_bypass_publication(tmp_path):
    directory = tmp_path / "product_images"
    directory.mkdir()
    (directory / "private.jpg").write_bytes(photo(format="JPEG"))
    (directory / "default.jpg").write_bytes(photo(format="JPEG"))
    files = PublicStaticFiles(directory=tmp_path)
    with pytest.raises(StarletteHTTPException) as error:
        await files.get_response("product_images/private.jpg", {"method": "GET"})
    assert error.value.status_code == 404
    assert (await files.get_response("product_images/default.jpg", {"method": "GET", "headers": []})).status_code == 200
