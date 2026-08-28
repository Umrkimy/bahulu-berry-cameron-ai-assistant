from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.activity_log import ActivityLog
from app.models.admin import Admin


async def record_activity(
    db: AsyncSession,
    *,
    admin: Admin | None = None,
    admin_id: int | None = None,
    action: str,
    entity_type: str,
    entity_id: int | None,
    description: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    db.add(
        ActivityLog(
            admin_id=admin.id if admin else admin_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            metadata_json=metadata,
        )
    )
