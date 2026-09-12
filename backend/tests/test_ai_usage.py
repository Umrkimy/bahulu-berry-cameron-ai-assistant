from types import SimpleNamespace
from uuid import uuid4
from decimal import Decimal

import pytest
import pytest_asyncio
from openai import OpenAIError, APITimeoutError
import httpx
from sqlalchemy import select

from app.core.config import settings
from app.models.ai_usage import AIUsage
from app.models.admin import Admin
from app.schemas.ai_assistant import AIChatMessage
from app.services import ai_assistant_services
from app.services.ai_usage_services import AIBudgetExceeded, calculate_cost_usd, get_usage_summary, reserve_ai_usage, settle_ai_usage


@pytest_asyncio.fixture(autouse=True)
async def usage_admin(session):
    session.add(Admin(id=1, username="usage-test-owner", email="usage@example.test", password_hash="unused", role="OWNER", is_active=True))
    await session.commit()


def test_gpt_4o_mini_cost_calculation():
    assert calculate_cost_usd("gpt-4o-mini", 1_000_000, 1_000_000) == Decimal("0.750000")


def test_operations_copilot_default_budget_and_response_limit():
    assert settings.OPENAI_MODEL == "gpt-4o-mini"
    assert settings.AI_MONTHLY_BUDGET_USD == 15.0
    assert settings.AI_MAX_COMPLETION_TOKENS == 350


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
    assert {
        "get_low_stock_summary",
        "get_order_workflow",
        "get_delivery_workload",
        "get_support_queue_summary",
        "get_shift_summary",
    }.issubset(tool_names)
    assert "reasoning_effort" not in captured
    assert captured["max_completion_tokens"] == settings.AI_MAX_COMPLETION_TOKENS


def test_operation_cards_contain_only_tool_backed_data_and_safe_routes():
    cards = ai_assistant_services._operation_cards(
        "get_low_stock_summary",
        {
            "success": True,
            "low_stock_count": 1,
            "products": [
                {
                    "product_id": 4,
                    "product_name": "Fictional Berry Bahulu",
                    "quantity": 2,
                    "low_stock_threshold": 5,
                }
            ],
        },
    )

    assert cards == [
        {
            "title": "Inventory warnings",
            "facts": ["Fictional Berry Bahulu: 2 left (warning at 5)"],
            "tone": "warning",
            "href": "/inventory",
        }
    ]


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


@pytest.mark.asyncio
async def test_timeout_retains_reservation_without_private_error(session, monkeypatch):
    async def timeout(**kwargs):
        raise APITimeoutError(request=httpx.Request("POST", "https://example.test"))

    monkeypatch.setattr(ai_assistant_services.client.chat.completions, "create", timeout)
    result = await ai_assistant_services.generate_ai_result(session, "Stock?", str(uuid4()), 1, [], False)
    usage = await session.scalar(select(AIUsage))
    assert result.outcome == "FAILED"
    assert "example.test" not in result.response
    assert usage.outcome == "UNCERTAIN"
    assert usage.estimated_cost_usd > 0
    assert (await get_usage_summary(session)).spent_usd == float(usage.estimated_cost_usd)
