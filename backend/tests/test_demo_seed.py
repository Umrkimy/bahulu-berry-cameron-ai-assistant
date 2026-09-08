from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker

from app import demo_seed
from app.models import Admin, Customer, MessagingEvent, Order, Product, SupportRequest


async def test_fictional_demo_seed_is_idempotent(session, monkeypatch):
    factory = async_sessionmaker(bind=session.bind, expire_on_commit=False)
    monkeypatch.setattr(demo_seed, "AsyncSessionLocal", factory)

    await demo_seed.seed_demo()
    await demo_seed.seed_demo()

    for model in (Admin, Customer, Product, Order, SupportRequest, MessagingEvent):
        count = await session.scalar(select(func.count()).select_from(model))
        assert count == (2 if model is Admin else 1)

    owner = await session.scalar(select(Admin).where(Admin.email == "owner@example.com"))
    staff = await session.scalar(select(Admin).where(Admin.email == "staff@example.com"))
    assert owner.role == "OWNER" and owner.is_superuser is True
    assert staff.role == "STAFF" and staff.is_superuser is False
