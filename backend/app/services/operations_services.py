from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import Admin
from app.models.inventory import Inventory
from app.models.order import Order
from app.models.product import Product
from app.models.refund_request import RefundRequest
from app.models.support import SupportRequest


SEVERITY_ORDER = {"CRITICAL": 0, "WARNING": 1}
REFUND_ALERT_STATUSES = {"REQUESTED", "UNDER_REVIEW", "APPROVED"}
OPEN_SUPPORT_STATUSES = {"NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"}


def _alert(
    *,
    alert_id: str,
    category: str,
    severity: str,
    title: str,
    description: str,
    source_at: datetime,
    href: str,
) -> dict:
    return {
        "id": alert_id,
        "category": category,
        "severity": severity,
        "title": title,
        "description": description,
        "source_at": source_at,
        "href": href,
    }


async def get_operation_alerts(
    db: AsyncSession,
    current_admin: Admin,
    category: str | None = None,
    severity: str | None = None,
    search: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> dict:
    alerts: list[dict] = []

    inventory_rows = await db.execute(
        select(
            Product.id,
            Product.name,
            Inventory.quantity,
            Inventory.low_stock_threshold,
            Inventory.updated_at,
        )
        .join(Inventory, Inventory.product_id == Product.id)
        .where(
            Product.is_active.is_(True),
            Inventory.quantity <= Inventory.low_stock_threshold,
        )
    )
    for row in inventory_rows:
        if row.quantity == 0:
            alerts.append(
                _alert(
                    alert_id=f"inventory-{row.id}",
                    category="INVENTORY",
                    severity="CRITICAL",
                    title=f"{row.name} is out of stock",
                    description="Stock is empty and needs replenishment.",
                    source_at=row.updated_at,
                    href="/inventory",
                )
            )
        else:
            alerts.append(
                _alert(
                    alert_id=f"inventory-{row.id}",
                    category="INVENTORY",
                    severity="WARNING",
                    title=f"{row.name} is low in stock",
                    description=f"{row.quantity} units remain (warning level: {row.low_stock_threshold}).",
                    source_at=row.updated_at,
                    href="/inventory",
                )
            )

    order_rows = await db.execute(
        select(Order.id, Order.created_at)
        .where(Order.status == "PENDING")
    )
    for row in order_rows:
        alerts.append(
            _alert(
                alert_id=f"order-{row.id}",
                category="ORDER",
                severity="WARNING",
                title=f"Order #{row.id} is pending",
                description="Update the order when fulfilment begins.",
                source_at=row.created_at,
                href="/orders",
            )
        )

    support_rows = await db.execute(
        select(SupportRequest.id, SupportRequest.priority, SupportRequest.updated_at)
        .where(
            SupportRequest.status.in_(OPEN_SUPPORT_STATUSES),
            SupportRequest.priority.in_(("HIGH", "URGENT")),
        )
    )
    for row in support_rows:
        is_urgent = row.priority == "URGENT"
        alerts.append(
            _alert(
                alert_id=f"support-{row.id}",
                category="SUPPORT",
                severity="CRITICAL" if is_urgent else "WARNING",
                title=f"{'Urgent' if is_urgent else 'High-priority'} support ticket #{row.id}",
                description="This ticket needs human attention.",
                source_at=row.updated_at,
                href="/whatsapp",
            )
        )

    if current_admin.role == "OWNER":
        refund_rows = await db.execute(
            select(RefundRequest.id, RefundRequest.status, RefundRequest.updated_at)
            .where(RefundRequest.status.in_(REFUND_ALERT_STATUSES))
        )
        for row in refund_rows:
            severity_value = "CRITICAL" if row.status == "APPROVED" else "WARNING"
            alerts.append(
                _alert(
                    alert_id=f"refund-{row.id}",
                    category="REFUND",
                    severity=severity_value,
                    title=f"Refund request #{row.id} needs attention",
                    description=f"Current state: {row.status.replace('_', ' ').lower()}.",
                    source_at=row.updated_at,
                    href="/refund-requests",
                )
            )

    if category:
        alerts = [alert for alert in alerts if alert["category"] == category]
    if severity:
        alerts = [alert for alert in alerts if alert["severity"] == severity]
    if search:
        query = search.casefold().strip()
        alerts = [
            alert
            for alert in alerts
            if query in " ".join(
                (alert["category"], alert["severity"], alert["title"], alert["description"])
            ).casefold()
        ]

    alerts.sort(
        key=lambda alert: (
            SEVERITY_ORDER[alert["severity"]],
            alert["source_at"],
        ),
        reverse=False,
    )
    critical = sum(alert["severity"] == "CRITICAL" for alert in alerts)
    warning = sum(alert["severity"] == "WARNING" for alert in alerts)

    return {
        "items": alerts[offset:offset + limit],
        "total": len(alerts),
        "limit": limit,
        "offset": offset,
        "counts": {"total": len(alerts), "critical": critical, "warning": warning},
    }
