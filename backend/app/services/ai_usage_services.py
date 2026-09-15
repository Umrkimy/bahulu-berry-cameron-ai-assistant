from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.admin import Admin
from app.models.ai_usage import AIUsage
from app.schemas.ai_usage import AIUsageByAdmin, AIUsageBySource, AIUsageDaily, AIUsageSummary
from app.services.transaction_lock import acquire_transaction_lock


MODEL_PRICING_USD_PER_MILLION = {
    "gpt-4o-mini": {"input": Decimal("0.15"), "output": Decimal("0.60")},
    "text-embedding-3-small": {"input": Decimal("0.02"), "output": Decimal("0")},
}
COUNTED_OUTCOMES = {"RESERVED", "COMPLETED", "UNCERTAIN"}
MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")


class AIBudgetExceeded(Exception):
    pass


def month_start_utc(now: datetime | None = None) -> datetime:
    local_now = (now or datetime.now(UTC)).astimezone(MALAYSIA_TZ)
    return local_now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).astimezone(UTC)


def calculate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    pricing = MODEL_PRICING_USD_PER_MILLION.get(model, MODEL_PRICING_USD_PER_MILLION["gpt-4o-mini"])
    return (
        Decimal(input_tokens) * pricing["input"] / Decimal(1_000_000)
        + Decimal(output_tokens) * pricing["output"] / Decimal(1_000_000)
    ).quantize(Decimal("0.000001"), rounding=ROUND_HALF_UP)


async def _month_spend(db: AsyncSession, *, source: str | None = None) -> Decimal:
    clauses = [AIUsage.created_at >= month_start_utc(), AIUsage.outcome.in_(COUNTED_OUTCOMES)]
    if source:
        clauses.append(AIUsage.source == source)
    result = await db.scalar(
        select(func.coalesce(func.sum(AIUsage.estimated_cost_usd), 0)).where(*clauses)
    )
    return Decimal(str(result or 0))


async def reserve_ai_usage(
    db: AsyncSession,
    *,
    admin_id: int | None,
    model: str,
    source: str = "DASHBOARD_ASSISTANT",
    monthly_budget_usd: float | None = None,
    max_completion_tokens: int | None = None,
    max_input_tokens: int | None = None,
    commit: bool = True,
) -> AIUsage:
    await acquire_transaction_lock(db, f"ai-monthly-budget:{source}")
    if model not in MODEL_PRICING_USD_PER_MILLION:
        raise AIBudgetExceeded
    reserved_cost = calculate_cost_usd(
        model,
        max_input_tokens if max_input_tokens is not None else settings.AI_MAX_RESERVED_INPUT_TOKENS,
        max_completion_tokens if max_completion_tokens is not None else settings.AI_MAX_COMPLETION_TOKENS,
    )
    budget = monthly_budget_usd if monthly_budget_usd is not None else settings.AI_MONTHLY_BUDGET_USD
    if await _month_spend(db, source=source) + reserved_cost > Decimal(str(budget)):
        raise AIBudgetExceeded
    usage = AIUsage(
        admin_id=admin_id,
        model=model,
        input_tokens=0,
        output_tokens=0,
        estimated_cost_usd=reserved_cost,
        outcome="RESERVED",
        source=source,
    )
    db.add(usage)
    if commit:
        await db.commit()
    else:
        await db.flush()
    await db.refresh(usage)
    return usage


async def settle_ai_usage(
    db: AsyncSession,
    usage: AIUsage,
    *,
    input_tokens: int = 0,
    output_tokens: int = 0,
    outcome: str,
    commit: bool = True,
) -> None:
    usage.input_tokens = input_tokens
    usage.output_tokens = output_tokens
    if outcome == "COMPLETED":
        usage.estimated_cost_usd = calculate_cost_usd(usage.model, input_tokens, output_tokens)
    elif outcome != "UNCERTAIN":
        usage.estimated_cost_usd = Decimal("0")
    usage.outcome = outcome
    if commit:
        await db.commit()
    else:
        await db.flush()


async def get_usage_summary(db: AsyncSession) -> AIUsageSummary:
    start = month_start_utc()
    spent = await _month_spend(db, source="DASHBOARD_ASSISTANT")
    budget = Decimal(str(settings.AI_MONTHLY_BUDGET_USD))
    exchange_rate = Decimal(str(settings.AI_DISPLAY_EXCHANGE_RATE))
    admin_rows = (await db.execute(
        select(AIUsage.admin_id, Admin.username, func.coalesce(func.sum(AIUsage.estimated_cost_usd), 0))
        .outerjoin(Admin, Admin.id == AIUsage.admin_id)
        .where(AIUsage.created_at >= start, AIUsage.outcome == "COMPLETED", AIUsage.source == "DASHBOARD_ASSISTANT")
        .group_by(AIUsage.admin_id, Admin.username)
        .order_by(func.sum(AIUsage.estimated_cost_usd).desc())
    )).all()
    daily_rows = (await db.execute(
        select(func.date(AIUsage.created_at), func.coalesce(func.sum(AIUsage.estimated_cost_usd), 0))
        .where(AIUsage.created_at >= start, AIUsage.outcome == "COMPLETED", AIUsage.source == "DASHBOARD_ASSISTANT")
        .group_by(func.date(AIUsage.created_at))
        .order_by(func.date(AIUsage.created_at))
    )).all()
    percent_used = float((spent / budget * 100) if budget else 0)
    return AIUsageSummary(
        budget_usd=float(budget),
        budget_rm_display=float(budget * exchange_rate),
        spent_usd=float(spent),
        spent_rm_display=float(spent * exchange_rate),
        remaining_usd=float(max(Decimal("0"), budget - spent)),
        percent_used=round(percent_used, 1),
        warning_threshold_percent=round(settings.AI_BUDGET_WARNING_THRESHOLD * 100, 1),
        warning=percent_used >= settings.AI_BUDGET_WARNING_THRESHOLD * 100,
        month_start=start,
        by_admin=[AIUsageByAdmin(admin_id=row[0], username=row[1] or "Deleted account", estimated_cost_usd=float(row[2])) for row in admin_rows],
        daily=[AIUsageDaily(date=str(row[0]), estimated_cost_usd=float(row[1])) for row in daily_rows],
        by_source=[
            AIUsageBySource(source="DASHBOARD_ASSISTANT", budget_usd=float(budget), estimated_cost_usd=float(spent)),
            AIUsageBySource(source="WHATSAPP_RAG", budget_usd=float(settings.WHATSAPP_RAG_MONTHLY_BUDGET_USD), estimated_cost_usd=float(await _month_spend(db, source="WHATSAPP_RAG"))),
        ],
    )
