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


ADMIN_FOOTER = "Bahulu Berry Cameron Admin · English / Bahasa Melayu"


def email_html(title: str, body: str, action_url: str | None = None, action_label: str | None = None, footer: str = ADMIN_FOOTER) -> str:
    paragraphs = "".join(f"<p>{escape(line)}</p>" for line in body.splitlines() if line.strip())
    button = f'<p><a href="{escape(action_url or "", quote=True)}">{escape(action_label or "Open dashboard")}</a></p>' if action_url else ""
    return f"<html><body><h2>{escape(title)}</h2>{paragraphs}{button}<hr><p><small>{escape(footer)}</small></p></body></html>"


async def deliver_email(*, to_address: str, email_type: str, subject: str, html: str, idempotency_key: str | None) -> tuple[str, str | None]:
    """Hand one email to the configured provider.

    Returns the delivery status (SENT, FAILED or SKIPPED) and the provider's
    message id. Never raises for provider or network errors, and never logs
    the address.
    """
    provider = settings.EMAIL_PROVIDER.lower().strip()
    if provider == "console":
        logger.info("email_console_delivery type=%s", email_type)
        return "SENT", None
    if provider != "resend":
        logger.warning("email_not_sent_unknown_provider type=%s", email_type)
        return "SKIPPED", None
    key = settings.RESEND_API_KEY.get_secret_value()
    if not key:
        logger.warning("email_not_sent_provider_not_configured type=%s", email_type)
        return "SKIPPED", None
    payload = {"from": settings.EMAIL_FROM, "to": [to_address], "subject": subject, "html": html}
    headers = {"Authorization": f"Bearer {key}"}
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post("https://api.resend.com/emails", json=payload, headers=headers)
        response.raise_for_status()
        return "SENT", response.json().get("id")
    except httpx.HTTPStatusError as error:
        # The status says why (403 is usually an unverified sender domain); the body may echo addresses, so it is not logged.
        logger.warning("email_delivery_failed type=%s status=%s", email_type, error.response.status_code)
    except httpx.HTTPError:
        logger.warning("email_delivery_failed type=%s status=network", email_type)
    return "FAILED", None


async def send_email(
    db: AsyncSession, *, recipient: Admin, email_type: str, subject: str, body: str,
    idempotency_key: str | None = None, action_url: str | None = None, action_label: str | None = None,
) -> EmailDelivery | None:
    if idempotency_key and await db.scalar(select(EmailDelivery.id).where(EmailDelivery.idempotency_key == idempotency_key)):
        return None
    delivery_status, provider_message_id = await deliver_email(
        to_address=recipient.email, email_type=email_type, subject=subject,
        html=email_html(subject, body, action_url, action_label), idempotency_key=idempotency_key,
    )
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


async def send_password_setup_email(db: AsyncSession, admin: Admin, *, purpose: str = "PASSWORD_RESET") -> EmailDelivery | None:
    token = await create_password_reset_token(db, admin, purpose=purpose)
    label = "Set up password" if purpose == "ACCOUNT_SETUP" else "Reset password"
    return await send_email(db, recipient=admin, email_type=purpose, subject=f"{label} for your admin account", body=f"Use this secure link within {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. If you did not request it, you can ignore this email.", action_url=_reset_url(token), action_label=label)


async def email_owners(db: AsyncSession, *, email_type: str, subject: str, body: str, idempotency_key_prefix: str) -> None:
    owners = (await db.execute(select(Admin).where(Admin.role == "OWNER", Admin.is_active.is_(True)))).scalars().all()
    for owner in owners:
        await send_email(db, recipient=owner, email_type=email_type, subject=subject, body=body, idempotency_key=f"{idempotency_key_prefix}:owner:{owner.id}")


async def purge_expired_email_security_records(db: AsyncSession) -> None:
    now = datetime.now(UTC)
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.expires_at < now))
    await db.commit()
