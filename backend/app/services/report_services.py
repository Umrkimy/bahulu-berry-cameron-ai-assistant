from __future__ import annotations

from collections import defaultdict
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import Inventory
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.product import Product
from app.models.support import SupportRequest


MALAYSIA_TZ = ZoneInfo("Asia/Kuala_Lumpur")
PRESETS = {"TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "LAST_90_DAYS", "LAST_12_MONTHS", "MONTH_TO_DATE"}
TERMINAL_SUPPORT_STATUSES = {"RESOLVED", "CLOSED"}


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _day_range(target_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(target_date, time.min, tzinfo=MALAYSIA_TZ)
    return start.astimezone(UTC), (start + timedelta(days=1)).astimezone(UTC)


def resolve_report_range(
    *, preset: str | None, start_date: date | None, end_date: date | None, today: date | None = None
) -> tuple[date, date, str]:
    if preset is None and start_date is None and end_date is None:
        preset = "LAST_30_DAYS"
    if preset and (start_date or end_date):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a preset or a custom date range, not both.")
    if preset:
        normalized = preset.upper()
        if normalized not in PRESETS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a valid report preset.")
        current = today or datetime.now(MALAYSIA_TZ).date()
        if normalized == "TODAY":
            return current, current, "Today"
        if normalized == "MONTH_TO_DATE":
            return current.replace(day=1), current, "Month to date"
        if normalized == "LAST_12_MONTHS":
            month = current.month - 11
            year = current.year
            if month <= 0:
                month += 12
                year -= 1
            return date(year, month, 1), current, "Last 12 months"
        days = {"LAST_7_DAYS": 7, "LAST_30_DAYS": 30, "LAST_90_DAYS": 90}[normalized]
        return current - timedelta(days=days - 1), current, f"Last {days} days"
    if start_date is None or end_date is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a report preset or both custom dates.")
    if end_date < start_date:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="End date must be on or after start date.")
    if (end_date - start_date).days + 1 > 366:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Custom reports can cover up to 366 days.")
    return start_date, end_date, "Custom range"


async def get_report_summary(
    db: AsyncSession, *, preset: str | None, start_date: date | None, end_date: date | None
) -> dict:
    range_start, range_end, label = resolve_report_range(preset=preset, start_date=start_date, end_date=end_date)
    start_utc, _ = _day_range(range_start)
    _, end_utc = _day_range(range_end)

    order_result = await db.execute(
        select(Order)
        .where(Order.created_at >= start_utc, Order.created_at < end_utc)
        .options(selectinload(Order.items).selectinload(OrderItem.product))
        .order_by(Order.created_at)
    )
    orders = order_result.scalars().all()
    paid_orders = [order for order in orders if order.payment_status == "PAID" and order.status != "CANCELLED"]
    paid_revenue = sum((order.total_amount for order in paid_orders), Decimal("0.00"))
    total_discount = sum((order.discount_amount for order in orders if order.status != "CANCELLED"), Decimal("0.00"))

    daily_sales: dict[date, dict[str, Decimal | int]] = {
        range_start + timedelta(days=index): {"paid_revenue": Decimal("0.00"), "paid_order_count": 0}
        for index in range((range_end - range_start).days + 1)
    }
    order_statuses: dict[str, int] = defaultdict(int)
    products: dict[int, dict[str, Decimal | int | str]] = {}
    promotions: dict[tuple[str, str | None], dict[str, Decimal | int | str | None]] = {}
    for order in orders:
        local_day = _as_utc(order.created_at).astimezone(MALAYSIA_TZ).date()
        order_statuses[order.status] += 1
        if order in paid_orders:
            daily_sales[local_day]["paid_revenue"] += order.total_amount
            daily_sales[local_day]["paid_order_count"] += 1
        if order.status == "CANCELLED":
            continue
        for item in order.items:
            product = products.setdefault(item.product_id, {"product_name": item.product.name, "units_sold": 0, "final_line_total": Decimal("0.00")})
            product["units_sold"] += item.quantity
            product["final_line_total"] += item.total_amount
            if item.discount_amount > 0:
                key = (item.discount_name or "Promotion", item.discount_type)
                promotion = promotions.setdefault(key, {"promotion_name": key[0], "promotion_type": key[1], "affected_units": 0, "discount_amount": Decimal("0.00")})
                promotion["affected_units"] += item.quantity
                promotion["discount_amount"] += item.discount_amount

    inventory_result = await db.execute(select(Inventory, Product).join(Product).where(Product.is_active.is_(True)))
    inventory_rows = inventory_result.all()
    inventory_health = {"active_product_count": 0, "inventory_record_count": len(inventory_rows), "healthy_count": 0, "low_stock_count": 0, "out_of_stock_count": 0}
    inventory_health["active_product_count"] = await db.scalar(
        select(func.count(Product.id)).where(Product.is_active.is_(True))
    ) or 0
    for inventory, _product in inventory_rows:
        if inventory.quantity <= 0:
            inventory_health["out_of_stock_count"] += 1
        elif inventory.quantity <= inventory.low_stock_threshold:
            inventory_health["low_stock_count"] += 1
        else:
            inventory_health["healthy_count"] += 1

    support_result = await db.execute(select(SupportRequest).where(SupportRequest.created_at >= start_utc, SupportRequest.created_at < end_utc))
    support_requests = support_result.scalars().all()
    support_statuses: dict[str, int] = defaultdict(int)
    support_priorities: dict[str, int] = defaultdict(int)
    for request in support_requests:
        support_statuses[request.status] += 1
        support_priorities[request.priority] += 1
    current_high_priority = await db.execute(
        select(SupportRequest.id).where(
            SupportRequest.priority.in_(["HIGH", "URGENT"]),
            SupportRequest.status.not_in(TERMINAL_SUPPORT_STATUSES),
        )
    )

    return {
        "report_range": {"start_date": range_start, "end_date": range_end, "label": label},
        "kpis": {
            "paid_revenue": paid_revenue,
            "paid_order_count": len(paid_orders),
            "total_orders_created": len(orders),
            "average_paid_order_value": paid_revenue / len(paid_orders) if paid_orders else Decimal("0.00"),
            "total_discount_granted": total_discount,
        },
        "daily_sales": [{"date": day, **values} for day, values in daily_sales.items()],
        "order_status_counts": [{"status": key, "count": value} for key, value in sorted(order_statuses.items())],
        "top_products": [
            {"product_id": product_id, **values}
            for product_id, values in sorted(products.items(), key=lambda item: (item[1]["final_line_total"], item[1]["units_sold"]), reverse=True)[:10]
        ],
        "promotion_impact": [
            values for _key, values in sorted(promotions.items(), key=lambda item: item[1]["discount_amount"], reverse=True)
        ],
        "inventory_health": inventory_health,
        "support_workload": {
            "tickets_created": len(support_requests),
            "status_counts": [{"status": key, "count": value} for key, value in sorted(support_statuses.items())],
            "priority_counts": [{"status": key, "count": value} for key, value in sorted(support_priorities.items())],
            "current_open_high_priority_count": len(current_high_priority.scalars().all()),
        },
    }
