import pytest
from sqlalchemy import select

from app.auth.jwt import create_access_token, verify_access_token
from app.auth.password import hash_password
from app.models.admin import Admin
from app.models.password_reset_token import PasswordResetToken
from app.services.email_services import create_password_reset_token


@pytest.mark.asyncio
async def test_new_reset_token_invalidates_prior_unused_tokens(session):
    admin = Admin(username="owner", email="owner@example.test", password_hash=hash_password("password123"), role="OWNER", is_superuser=True)
    session.add(admin)
    await session.flush()
    first = await create_password_reset_token(session, admin, purpose="ACCOUNT_SETUP")
    second = await create_password_reset_token(session, admin)
    tokens = (await session.execute(select(PasswordResetToken).where(PasswordResetToken.admin_id == admin.id))).scalars().all()
    assert first != second
    assert sum(token.used_at is None for token in tokens) == 1
    assert next(token for token in tokens if token.used_at is None).purpose == "PASSWORD_RESET"


def test_session_token_carries_session_version():
    token = create_access_token({"sub": "1", "sv": 3})
    payload = verify_access_token(token)
    assert payload is not None
    assert payload["sv"] == 3
