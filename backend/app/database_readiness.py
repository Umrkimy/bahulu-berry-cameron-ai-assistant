import asyncio
from functools import lru_cache
from pathlib import Path

from alembic.config import Config
from alembic.script import ScriptDirectory
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncConnection

from app.db.database import engine

BACKEND_DIRECTORY = Path(__file__).resolve().parent.parent


@lru_cache(maxsize=1)
def expected_head() -> str:
    """The newest migration shipped with this build, read from the scripts."""
    config = Config(str(BACKEND_DIRECTORY / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIRECTORY / "alembic"))
    head = ScriptDirectory.from_config(config).get_current_head()
    if head is None:
        raise RuntimeError("No Alembic head revision found.")
    return head


async def current_revision(connection: AsyncConnection) -> str | None:
    """The revision the database is on, or None before the first migration."""
    table_exists = await connection.run_sync(
        lambda sync_connection: sync_connection.dialect.has_table(sync_connection, "alembic_version")
    )
    if not table_exists:
        return None
    return (await connection.execute(text("SELECT version_num FROM alembic_version"))).scalar_one_or_none()


async def check_readiness() -> tuple[bool, dict[str, str]]:
    """Returns (ready, public body). The body never includes connection details."""
    try:
        async with engine.connect() as connection:
            revision = await current_revision(connection)
    except Exception:
        return False, {"status": "unavailable"}
    if revision != expected_head():
        return False, {"status": "migrations_pending"}
    return True, {"status": "ready", "revision": revision}


async def main() -> None:
    ready, body = await check_readiness()
    await engine.dispose()
    if not ready:
        raise SystemExit(f"Database readiness check failed: {body['status']}.")
    print(f"Database readiness check passed at revision {body['revision']}.")


if __name__ == "__main__":
    asyncio.run(main())
