import asyncio

from sqlalchemy import text

from app.db.database import engine


async def main() -> None:
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))
    await engine.dispose()
    print("Database readiness check passed.")


if __name__ == "__main__":
    asyncio.run(main())
