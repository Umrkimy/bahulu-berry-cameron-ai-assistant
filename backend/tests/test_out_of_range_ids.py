import httpx

from app.db.database import get_db
from main import app

# Larger than a Postgres integer column; the staging ZAP API scan sent this ID.
OVERSIZED_ID = 493981248578144101


async def test_oversized_id_is_rejected_instead_of_crashing(session):
    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
            response = await client.get(f"/api/storefront/products/{OVERSIZED_ID}")
    finally:
        app.dependency_overrides.pop(get_db, None)

    # SQLite accepts any integer, so the product is simply missing there.
    expected = 422 if session.get_bind().dialect.name == "postgresql" else 404
    assert response.status_code == expected
    assert "Traceback" not in response.text
