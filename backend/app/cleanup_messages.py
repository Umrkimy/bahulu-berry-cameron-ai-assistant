import asyncio

from app.db.database import AsyncSessionLocal
from app.services.messaging import purge_expired_message_content


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await purge_expired_message_content(db)
    print("Expired message content cleared.")


if __name__ == "__main__":
    asyncio.run(main())
