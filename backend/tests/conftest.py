import os

import pytest
import pytest_asyncio
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.db.database import Base


@pytest.fixture(autouse=True)
def whatsapp_off(monkeypatch):
    # A developer's backend/.env may hold real Meta values; tests never use them.
    monkeypatch.setattr(settings, "WHATSAPP_MENU_ENABLED", False)
    monkeypatch.setattr(settings, "WHATSAPP_META_OUTBOUND_ENABLED", False)
    monkeypatch.setattr(settings, "WHATSAPP_META_ACCESS_TOKEN", SecretStr(""))


@pytest_asyncio.fixture
async def session():
    database_url = os.getenv("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = create_async_engine(database_url)

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as database_session:
        yield database_session

    await engine.dispose()
