from hashlib import sha256

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def acquire_transaction_lock(db: AsyncSession, resource: str) -> None:
    if db.get_bind().dialect.name == "postgresql":
        key = int.from_bytes(sha256(resource.encode()).digest()[:8], "big", signed=True)
        await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": key})
    elif db.get_bind().dialect.name == "sqlite":
        await db.execute(text("UPDATE admins SET id = id WHERE 0"))
