from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import Admin
from app.models.notification import Notification
from app.services.email_services import email_owners


ROUTES = {
    "TASK": "/tasks",
    "SUPPORT": "/whatsapp",
    "REFUND": "/refund-requests",
    "PAYMENT": "/orders",
    "INVENTORY": "/inventory",
}


async def active_owners(db: AsyncSession) -> list[Admin]:
    result = await db.execute(
        select(Admin).where(Admin.role == "OWNER", Admin.is_active.is_(True)).order_by(Admin.id)
    )
    return list(result.scalars().all())


def add_notification(
    db: AsyncSession,
    *,
    recipient_id: int,
    notification_type: str,
    title: str,
    description: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
) -> Notification:
    route = ROUTES.get(notification_type)
    if route is None:
        raise ValueError("Unsupported notification type.")
    item = Notification(
        admin_id=recipient_id,
        notification_type=notification_type,
        title=title[:160],
        description=description[:500],
        route=route,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(item)
    return item


async def notify_owners(
    db: AsyncSession,
    *,
    notification_type: str,
    title: str,
    description: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    exclude_admin_id: int | None = None,
) -> None:
    for owner in await active_owners(db):
        if owner.id != exclude_admin_id:
            add_notification(
                db,
                recipient_id=owner.id,
                notification_type=notification_type,
                title=title,
                description=description,
                entity_type=entity_type,
                entity_id=entity_id,
            )


async def notify_owners_with_email(
    db: AsyncSession, *, notification_type: str, title: str, description: str,
    entity_type: str | None = None, entity_id: int | None = None, email_type: str, idempotency_key_prefix: str,
) -> None:
    await notify_owners(db, notification_type=notification_type, title=title, description=description, entity_type=entity_type, entity_id=entity_id)
    await email_owners(db, email_type=email_type, subject=title, body=description, idempotency_key_prefix=idempotency_key_prefix)


async def purge_expired_notifications(db: AsyncSession, *, days: int = 90) -> int:
    result = await db.execute(
        delete(Notification).where(Notification.created_at < datetime.now(UTC) - timedelta(days=days))
    )
    await db.commit()
    return result.rowcount or 0
