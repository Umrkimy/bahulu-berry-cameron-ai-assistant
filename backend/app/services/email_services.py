import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from html import escape

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.admin import Admin
from app.models.email_delivery import EmailDelivery
from app.models.password_reset_token import PasswordResetToken

logger = logging.getLogger("bahulu.email")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _reset_url(token: str) -> str:
    return f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?token={token}"


def _html(title: str, body: str, action_url: str | None = None, action_label: str | None = None) -> str:
    button = f'<p><a href="{escape(action_url or "", quote=True)}">{escape(action_label or "Open dashboard")}</a></p>' if action_url else ""
    return f"<html><body><h2>{escape(title)}</h2><p>{escape(body)}</p>{button}<hr><p><small>Bahulu Berry Cameron Admin · English / Bahasa Melayu</small></p></body></html>"


async def send_email(
    db: AsyncSession, *, recipient: Admin, email_type: str, subject: str, body: str,
    idempotency_key: str | None = None, action_url: str | None = None, action_label: str | None = None,
) -> EmailDelivery | None:
    if idempotency_key and await db.scalar(select(EmailDelivery.id).where(EmailDelivery.idempotency_key == idempotency_key)):
        return None
    provider = settings.EMAIL_PROVIDER.lower().strip()
    provider_message_id: str | None = None
    delivery_status = "SENT"
    if provider == "resend":
        key = settings.RESEND_API_KEY.get_secret_value()
        if not key:
            logger.warning("email_not_sent_provider_not_configured type=%s", email_type)
            delivery_status = "SKIPPED"
        else:
            payload = {"from": settings.EMAIL_FROM, "to": [recipient.email], "subject": subject, "html": _html(subject, body, action_url, action_label)}
            headers = {"Authorization": f"Bearer {key}"}
            if idempotency_key:
                headers["Idempotency-Key"] = idempotency_key
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
                response.raise_for_status()
                provider_message_id = response.json().get("id")
            except httpx.HTTPError:
                logger.warning("email_delivery_failed type=%s", email_type)
                delivery_status = "FAILED"
    elif provider != "console":
        logger.warning("email_not_sent_unknown_provider type=%s", email_type)
        delivery_status = "SKIPPED"
    else:
        logger.info("email_console_delivery type=%s recipient_admin_id=%s", email_type, recipient.id)

    record = EmailDelivery(recipient_admin_id=recipient.id, email_type=email_type, idempotency_key=idempotency_key, status=delivery_status, provider_message_id=provider_message_id, sent_at=datetime.now(UTC) if delivery_status == "SENT" else None)
    db.add(record)
    return record


async def create_password_reset_token(db: AsyncSession, admin: Admin, *, purpose: str = "PASSWORD_RESET") -> str:
    token = secrets.token_urlsafe(32)
    now = datetime.now(UTC)
    existing = (await db.execute(select(PasswordResetToken).where(PasswordResetToken.admin_id == admin.id, PasswordResetToken.used_at.is_(None)))).scalars().all()
    for item in existing:
        item.used_at = now
    db.add(PasswordResetToken(admin_id=admin.id, token_hash=_hash_token(token), purpose=purpose, expires_at=now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)))
    await db.flush()
    return token


async def send_password_setup_email(db: AsyncSession, admin: Admin, *, purpose: str = "PASSWORD_RESET") -> None:
    token = await create_password_reset_token(db, admin, purpose=purpose)
    label = "Set up password" if purpose == "ACCOUNT_SETUP" else "Reset password"
    await send_email(db, recipient=admin, email_type=purpose, subject=f"{label} for your admin account", body=f"Use this secure link within {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. If you did not request it, you can ignore this email.", action_url=_reset_url(token), action_label=label)


async def email_owners(db: AsyncSession, *, email_type: str, subject: str, body: str, idempotency_key_prefix: str) -> None:
    owners = (await db.execute(select(Admin).where(Admin.role == "OWNER", Admin.is_active.is_(True)))).scalars().all()
    for owner in owners:
        await send_email(db, recipient=owner, email_type=email_type, subject=subject, body=body, idempotency_key=f"{idempotency_key_prefix}:owner:{owner.id}")


async def purge_expired_email_security_records(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < now))
    await db.commit()
