from starlette.requests import Request
from pydantic import SecretStr
import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.api.routes.settings import email_status, request_owner_password_reset
from app.core.config import settings
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.password_reset_token import PasswordResetToken


def make_request() -> Request:
    return Request({"type": "http", "method": "POST", "path": "/api/settings/password-reset/2", "headers": [], "client": ("127.0.0.1", 12345)})


async def test_email_status_exposes_readiness_without_the_provider_key(monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "RESEND_API_KEY", SecretStr("test-key"))
    monkeypatch.setattr(settings, "EMAIL_FROM", "Bahulu Berry Cameron <admin@example.test>")

    result = await email_status(None)

    assert result.mode == "delivery"
    assert result.delivery_enabled is True
    assert result.sender == "Bahulu Berry Cameron <admin@example.test>"
    assert "test-key" not in result.model_dump_json()


async def test_owner_reset_replaces_prior_token_and_records_activity(session, monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    member = Admin(username="staff", email="staff@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=True)
    session.add_all([owner, member])
    await session.commit()

    first = await request_owner_password_reset(member.id, make_request(), session, owner)
    second = await request_owner_password_reset(member.id, make_request(), session, owner)

    tokens = (await session.execute(select(PasswordResetToken).where(PasswordResetToken.admin_id == member.id).order_by(PasswordResetToken.id))).scalars().all()
    activity = (await session.execute(select(ActivityLog).where(ActivityLog.entity_id == member.id))).scalars().all()
    assert first.message == second.message
    assert len(tokens) == 2
    assert tokens[0].used_at is not None
    assert tokens[1].used_at is None
    assert len(activity) == 2
    assert all(item.action == "password_reset_requested" for item in activity)


async def test_owner_reset_rejects_inactive_or_missing_members(session):
    owner = Admin(username="owner", email="owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    inactive = Admin(username="inactive", email="inactive@example.test", password_hash="x", role="STAFF", is_superuser=False, is_active=False)
    session.add_all([owner, inactive])
    await session.commit()

    with pytest.raises(HTTPException, match="active team members") as inactive_error:
        await request_owner_password_reset(inactive.id, make_request(), session, owner)
    with pytest.raises(HTTPException, match="Team member not found") as missing_error:
        await request_owner_password_reset(999, make_request(), session, owner)

    assert inactive_error.value.status_code == 400
    assert missing_error.value.status_code == 404
