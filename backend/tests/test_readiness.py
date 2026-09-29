from pathlib import Path
import re

import httpx
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

import app.database_readiness as readiness
from main import app

VERSIONS_DIRECTORY = Path(__file__).resolve().parent.parent / "alembic" / "versions"


def test_expected_head_is_the_newest_migration():
    revisions = set()
    down_revisions = set()
    for path in VERSIONS_DIRECTORY.glob("*.py"):
        source = path.read_text(encoding="utf-8")
        revisions.add(re.search(r'^revision\s*=\s*"([^"]+)"', source, re.MULTILINE).group(1))
        down = re.search(r'\bdown_revision\s*=\s*"([^"]+)"', source)
        if down:
            down_revisions.add(down.group(1))
    [head] = revisions - down_revisions
    assert readiness.expected_head() == head


@pytest.fixture
async def sqlite_engine(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    monkeypatch.setattr(readiness, "engine", engine)
    yield engine
    await engine.dispose()


async def _ready_response():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver") as client:
        return await client.get("/ready")


async def test_ready_reports_revision_when_database_is_at_head(sqlite_engine):
    async with sqlite_engine.begin() as connection:
        await connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(64) NOT NULL)"))
        await connection.execute(text("INSERT INTO alembic_version VALUES (:rev)"), {"rev": readiness.expected_head()})

    response = await _ready_response()

    assert response.status_code == 200
    assert response.json() == {"status": "ready", "revision": readiness.expected_head()}


async def test_ready_fails_when_migrations_are_behind(sqlite_engine):
    async with sqlite_engine.begin() as connection:
        await connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(64) NOT NULL)"))
        await connection.execute(text("INSERT INTO alembic_version VALUES ('0001_old')"))

    response = await _ready_response()

    assert response.status_code == 503
    assert response.json() == {"status": "migrations_pending"}


async def test_ready_fails_before_first_migration(sqlite_engine):
    response = await _ready_response()

    assert response.status_code == 503
    assert response.json() == {"status": "migrations_pending"}


async def test_ready_fails_without_leaking_details_when_database_is_down(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite:////nonexistent-directory/for/test.db")
    monkeypatch.setattr(readiness, "engine", engine)
    try:
        response = await _ready_response()
    finally:
        await engine.dispose()

    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
