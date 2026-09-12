from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.ai_action_confirmation import AIActionConfirmation
from app.services import ai_assistant_services as ai


async def _admin(session, username: str, role: str) -> Admin:
    admin = Admin(username=username, email=f"{username}@example.test", password_hash="test", role=role, is_active=True)
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin


@pytest.mark.asyncio
async def test_confirmation_preview_executes_once_without_a_model_call(session, monkeypatch):
    owner = await _admin(session, "copilot-owner", "OWNER")
    calls = []

    async def handler(**kwargs):
        calls.append(kwargs)
        return {"success": True, "message": "Stock updated."}

    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", handler)
    await ai._store_confirmation(session, owner.id, "conversation", "adjust_product_stock", {"product_name": "Fictional Bahulu", "quantity_change": -2})
    pending = await ai._get_stored_confirmation(session, owner.id, "conversation")
    assert pending is not None
    preview = ai._confirmation_preview(pending)
    assert preview["action_title"] == "Review stock adjustment"
    assert "Quantity change: -2" in preview["details"]

    result = await ai.confirm_pending_confirmation(session, owner.id, "conversation")
    assert result.outcome == "COMPLETED"
    assert result.response == "Stock updated."
    assert len(calls) == 1
    assert (await ai.confirm_pending_confirmation(session, owner.id, "conversation")).outcome == "FAILED"
    assert len(calls) == 1
    assert await session.scalar(select(func.count()).select_from(ActivityLog)) == 1


@pytest.mark.asyncio
async def test_cancel_expiry_and_other_owner_are_non_destructive(session, monkeypatch):
    owner = await _admin(session, "copilot-owner-2", "OWNER")
    other_owner = await _admin(session, "copilot-owner-3", "OWNER")
    calls = []

    async def handler(**kwargs):
        calls.append(kwargs)
        return {"success": True, "message": "Should not run."}

    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", handler)
    await ai._store_confirmation(session, owner.id, "cancelled", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    assert (await ai.cancel_pending_confirmation(session, other_owner.id, "cancelled")).outcome == "FAILED"
    assert (await ai.cancel_pending_confirmation(session, owner.id, "cancelled")).outcome == "CANCELLED"
    assert calls == []
    assert (await ai.confirm_pending_confirmation(session, owner.id, "cancelled")).outcome == "FAILED"

    await ai._store_confirmation(session, owner.id, "expired", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    pending = await ai._get_stored_confirmation(session, owner.id, "expired")
    assert pending is not None
    pending.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await session.commit()
    assert (await ai.confirm_pending_confirmation(session, owner.id, "expired")).outcome == "FAILED"
    assert calls == []


@pytest.mark.asyncio
async def test_staff_cannot_confirm_or_cancel_an_owner_preview(session, monkeypatch):
    owner = await _admin(session, "copilot-owner-4", "OWNER")
    staff = await _admin(session, "copilot-staff", "STAFF")
    calls = []

    async def handler(**kwargs):
        calls.append(kwargs)
        return {"success": True, "message": "Should not run."}

    monkeypatch.setitem(ai.TOOL_HANDLERS, "adjust_product_stock", handler)
    await ai._store_confirmation(session, owner.id, "staff", "adjust_product_stock", {"product_name": "Fictional", "quantity_change": 1})
    assert (await ai.confirm_pending_confirmation(session, staff.id, "staff")).outcome == "FAILED"
    assert (await ai.cancel_pending_confirmation(session, staff.id, "staff")).outcome == "FAILED"
    assert calls == []
