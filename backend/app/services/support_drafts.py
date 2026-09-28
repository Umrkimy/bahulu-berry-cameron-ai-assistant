"""Saved AI reply drafts. Staff review every draft; nothing is sent automatically."""
from datetime import UTC, datetime, timedelta
import re
from urllib.parse import quote

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.support_draft import SupportDraft
from app.schemas.support import SupportDraftPublic, SupportDraftReviewPublic, SupportDraftSource

DRAFT_RETENTION = timedelta(days=30)


def whatsapp_number(*candidates: str | None) -> str | None:
    """Digits of the first usable WhatsApp contact, or None."""
    for candidate in candidates:
        number = re.sub(r"\D", "", candidate or "")
        if len(number) >= 8:
            return number
    return None


def whatsapp_url(number: str, text: str | None = None) -> str:
    return f"https://wa.me/{number}" + (f"?text={quote(text, safe='')}" if text else "")


async def save_draft(
    db: AsyncSession,
    *,
    draft: SupportDraftPublic,
    customer_message: str,
    conversation_id: int | None,
    messaging_event_id: int | None,
    support_request_id: int | None,
) -> SupportDraft | None:
    """Store a reply draft for review and supersede older pending drafts in the same thread.

    Handoffs carry no reply, so they are not stored. The caller commits.
    """
    if draft.handoff_required or not draft.reply:
        return None
    if conversation_id is not None:
        scope = SupportDraft.conversation_id == conversation_id
    elif support_request_id is not None:
        scope = SupportDraft.support_request_id == support_request_id
    else:
        scope = None
    if scope is not None:
        await db.execute(update(SupportDraft).where(scope, SupportDraft.status == "PENDING_REVIEW").values(status="SUPERSEDED"))
    saved = SupportDraft(
        conversation_id=conversation_id,
        messaging_event_id=messaging_event_id,
        support_request_id=support_request_id,
        language=draft.language,
        customer_message=customer_message,
        body=draft.reply,
        source_ids=[{"type": source.type, "id": source.id, "label": source.label} for source in draft.sources],
        model=draft.model,
        prompt_version=draft.prompt_version,
        status="PENDING_REVIEW",
        expires_at=datetime.now(UTC) + DRAFT_RETENTION,
    )
    db.add(saved)
    await db.flush()
    return saved


async def purge_expired_drafts(db: AsyncSession) -> None:
    await db.execute(
        update(SupportDraft)
        .where(SupportDraft.expires_at.is_not(None), SupportDraft.expires_at <= datetime.now(UTC), SupportDraft.body.is_not(None) | SupportDraft.customer_message.is_not(None) | SupportDraft.edited_body.is_not(None))
        .values(customer_message=None, body=None, edited_body=None)
    )


def review_public(draft: SupportDraft, *, whatsapp_available: bool) -> SupportDraftReviewPublic:
    return SupportDraftReviewPublic(
        id=draft.id,
        support_request_id=draft.support_request_id,
        conversation_id=draft.conversation_id,
        language=draft.language,
        customer_message=draft.customer_message,
        body=draft.body,
        edited_body=draft.edited_body,
        sources=[SupportDraftSource(**source) for source in draft.source_ids or []],
        status=draft.status,
        reviewed_by_admin_id=draft.reviewed_by_admin_id,
        reviewed_at=draft.reviewed_at,
        created_at=draft.created_at,
        whatsapp_available=whatsapp_available,
    )
