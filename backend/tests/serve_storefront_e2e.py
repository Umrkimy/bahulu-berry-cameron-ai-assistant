"""Real API with a fresh temporary database/media directory, never the working DB."""
import asyncio
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
runtime = Path(tempfile.mkdtemp(prefix="bahulu-storefront-e2e-"))
# Test-only values are deliberately independent from every local .env value.
os.environ.update({
    "DATABASE_URL": f"sqlite+aiosqlite:///{(runtime / 'test.db').as_posix()}",
    "PRODUCT_MEDIA_DIRECTORY": str(runtime / "media"),
    "ENVIRONMENT": "development", "DEBUG": "false",
    "SECRET_KEY": "fictional-e2e-only-signing-key-not-for-real-use",
    "OPENAI_API_KEY": "fictional-e2e-unused", "STRIPE_SECRET_KEY": "sk_test_fictional-e2e-unused",
    "STRIPE_WEBHOOK_SECRET": "fictional-e2e-unused",
    "STRIPE_SUCCESS_URL": "http://127.0.0.1:4174/unused", "STRIPE_CANCEL_URL": "http://127.0.0.1:4174/unused",
    "ALLOWED_ORIGINS": "http://127.0.0.1:4174,http://127.0.0.1:3100",
    "TRUSTED_HOSTS": "127.0.0.1,localhost,testserver", "WHATSAPP_META_INBOUND_ENABLED": "false",
    "WHATSAPP_RAG_ENABLED": "false", "EMAIL_PROVIDER": "console",
    # Website checkout runs against the fake provider below; Stripe is never called.
    "STOREFRONT_CHECKOUT_ENABLED": "true",
})

from app.db.database import Base, engine, AsyncSessionLocal
from app.models import Admin, StorefrontFeature
from app.auth.password import hash_password
from main import app
import app.payments.service as payment_service
import uvicorn


class FictionalPaymentProvider:
    """Hands back a fictional hosted payment page; the browser test intercepts it."""

    name = "stripe"

    async def create_payment(self, *, payment_id, **_):
        return {"provider_payment_id": f"cs_test_e2e_{payment_id}", "payment_url": f"https://payments.example.com/pay/{payment_id}"}

    async def expire_payment(self, provider_payment_id):
        return None

    async def refund_payment(self, provider_payment_id, payment_id):
        raise RuntimeError("Refunds are not part of the storefront e2e run.")


payment_service.get_payment_provider = lambda _name: FictionalPaymentProvider()


async def seed():
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        session.add(Admin(username="fictional-owner", email="owner@example.com", password_hash=hash_password("Fictional-E2E-Only-123!"), role="OWNER", is_active=True))
        session.add(StorefrontFeature(id=1))
        await session.commit()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
    uvicorn.run(app, host="127.0.0.1", port=8100, log_level="warning", access_log=False)
