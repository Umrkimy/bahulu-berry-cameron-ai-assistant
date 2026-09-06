from types import SimpleNamespace
from uuid import uuid4
from decimal import Decimal

import pytest
from openai import OpenAIError
from sqlalchemy import select

from app.core.config import settings
from app.models.ai_usage import AIUsage
from app.schemas.ai_assistant import AIChatMessage
from app.services import ai_assistant_services
from app.services.ai_usage_services import AIBudgetExceeded, calculate_cost_usd, get_usage_summary, reserve_ai_usage, settle_ai_usage


def test_gpt_4o_mini_cost_calculation():
    assert calculate_cost_usd("gpt-4o-mini", 1_000_000, 1_000_000) == Decimal("0.750000")


@pytest.mark.asyncio
async def test_usage_reservation_settlement_and_monthly_summary(session, monkeypatch):
    monkeypatch.setattr(settings, "AI_MONTHLY_BUDGET_USD", 8.0)
    reservation = await reserve_ai_usage(session, admin_id=1, model="gpt-4o-mini")
    assert reservation.outcome == "RESERVED"
    assert reservation.estimated_cost_usd > 0

    await settle_ai_usage(session, reservation, input_tokens=1_000, output_tokens=500, outcome="COMPLETED")
    summary = await get_usage_summary(session)

    assert summary.spent_usd == pytest.approx(0.00045)
    assert summary.remaining_usd == pytest.approx(7.99955)
    assert summary.warning is False


@pytest.mark.asyncio
async def test_budget_blocks_provider_call_before_it_is_sent(session, monkeypatch):
    monkeypatch.setattr(settings, "AI_MONTHLY_BUDGET_USD", 0.001)

    with pytest.raises(AIBudgetExceeded):
        await reserve_ai_usage(session, admin_id=1, model="gpt-4o-mini")

    assert (await session.execute(select(AIUsage))).scalars().all() == []


@pytest.mark.asyncio
async def test_staff_ai_uses_read_only_tools_and_omits_none_reasoning_effort(session, monkeypatch):
    captured = {}

    async def fake_create(**kwargs):
        captured.update(kwargs)
        return SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(tool_calls=[], content="Stock is available."))],
            usage=SimpleNamespace(prompt_tokens=100, completion_tokens=20),
        )

    monkeypatch.setattr(ai_assistant_services.client.chat.completions, "create", fake_create)
    monkeypatch.setattr(settings, "OPENAI_REASONING_EFFORT", "none")

    response = await ai_assistant_services.generate_ai_response(
        db=session,
        message="Check product stock",
        conversation_id=str(uuid4()),
        admin_id=1,
        conversation_history=[AIChatMessage(role="user", content="Hello")],
        is_owner=False,
    )

    tool_names = {tool["function"]["name"] for tool in captured["tools"]}
    assert response == "Stock is available."
    assert tool_names.isdisjoint(ai_assistant_services.WRITE_TOOLS)
    assert "reasoning_effort" not in captured
    assert captured["max_completion_tokens"] == settings.AI_MAX_COMPLETION_TOKENS


@pytest.mark.asyncio
async def test_provider_error_is_safe_and_does_not_keep_reserved_cost(session, monkeypatch):
    async def fake_create(**_kwargs):
        raise OpenAIError("provider failure")

    monkeypatch.setattr(ai_assistant_services.client.chat.completions, "create", fake_create)
    response = await ai_assistant_services.generate_ai_response(
        db=session,
        message="Check product stock",
        conversation_id=str(uuid4()),
        admin_id=1,
        conversation_history=[],
        is_owner=True,
    )

    usage = (await session.execute(select(AIUsage))).scalar_one()
    assert response == "The AI service is temporarily unavailable. Please try again shortly."
    assert usage.outcome == "FAILED"
    assert float(usage.estimated_cost_usd) == 0
