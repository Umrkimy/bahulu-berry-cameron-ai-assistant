from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_superuser
from app.core.config import settings
from app.core.rate_limit import PASSWORD_RESET_LIMIT, rate_limiter
from app.db.database import get_db
from app.models.admin import Admin
from app.models.storefront_homepage import StorefrontHomepage
from app.schemas.settings import EmailConfigurationStatus, OwnerPasswordResetResponse
from app.schemas.storefront_homepage import (
    GoogleReadiness,
    HomepageAdminResponse,
    HomepageDraftUpdate,
    HomepageGoogleCheckResponse,
    HomepagePublishRequest,
    StorefrontHomepageContent,
    publication_issues,
)
from app.services.activity_services import record_activity
from app.services.email_services import send_password_setup_email
from app.services.google_place import GooglePlaceUnavailable, fetch_google_place
from app.services.storefront_homepage import ensure_homepage_record, get_homepage_record


router = APIRouter()


def _google_readiness(content: StorefrontHomepageContent) -> GoogleReadiness:
    enabled = settings.STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED
    places_key = bool(settings.GOOGLE_PLACES_API_KEY.get_secret_value())
    maps_key = bool(settings.GOOGLE_MAPS_EMBED_API_KEY.get_secret_value())
    place_id = bool(content.google_place_id)
    return GoogleReadiness(
        integrations_enabled=enabled,
        places_key_configured=places_key,
        maps_embed_key_configured=maps_key,
        place_id_configured=place_id,
        ready_for_reviews=enabled and places_key and place_id,
        ready_for_map=enabled and places_key and maps_key and place_id,
    )


def _homepage_response(record) -> HomepageAdminResponse:
    draft = StorefrontHomepageContent.model_validate(record.draft_content)
    return HomepageAdminResponse(
        draft=draft,
        published=StorefrontHomepageContent.model_validate(record.published_content),
        draft_version=record.draft_version,
        published_version=record.published_version,
        updated_at=record.updated_at,
        published_at=record.published_at,
        google_readiness=_google_readiness(draft),
    )


@router.get("/storefront-homepage", response_model=HomepageAdminResponse)
async def get_storefront_homepage_settings(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
):
    record = await ensure_homepage_record(db)
    await db.commit()
    await db.refresh(record)
    return _homepage_response(record)


@router.put("/storefront-homepage/draft", response_model=HomepageAdminResponse)
async def update_storefront_homepage_draft(
    payload: HomepageDraftUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await ensure_homepage_record(db)
    now = datetime.now(UTC)
    result = await db.execute(
        update(StorefrontHomepage)
        .where(
            StorefrontHomepage.id == 1,
            StorefrontHomepage.draft_version == payload.expected_version,
        )
        .values(
            draft_content=payload.content.model_dump(mode="json"),
            draft_version=payload.expected_version + 1,
            updated_by_admin_id=current_admin.id,
            updated_at=now,
        )
    )
    if result.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This homepage draft changed in another session. Reload it before saving again.")
    await record_activity(
        db, admin=current_admin, action="storefront_homepage_draft_saved",
        entity_type="storefront_homepage", entity_id=1,
        description="Saved the storefront homepage draft.",
        metadata={"draft_version": payload.expected_version + 1},
    )
    await db.commit()
    record = await get_homepage_record(db)
    return _homepage_response(record)


@router.post("/storefront-homepage/publish", response_model=HomepageAdminResponse)
async def publish_storefront_homepage(
    payload: HomepagePublishRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    record = await ensure_homepage_record(db)
    if record.draft_version != payload.expected_draft_version:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This homepage draft changed in another session. Reload it before publishing.")
    content = StorefrontHomepageContent.model_validate(record.draft_content)
    issues = publication_issues(content, _google_readiness(content))
    if issues:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail={"code": "HOMEPAGE_NOT_READY", "issues": issues})
    if content.reviews.enabled or content.location.enabled:
        try:
            await fetch_google_place(content.google_place_id or "", "en")
        except GooglePlaceUnavailable as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={"code": "GOOGLE_PLACE_NOT_READY", "issues": ["The approved Google listing could not be verified safely."]},
            ) from error

    now = datetime.now(UTC)
    result = await db.execute(
        update(StorefrontHomepage)
        .where(StorefrontHomepage.id == 1, StorefrontHomepage.draft_version == payload.expected_draft_version)
        .values(
            published_content=content.model_dump(mode="json"),
            published_version=record.published_version + 1,
            published_by_admin_id=current_admin.id,
            published_at=now,
        )
    )
    if result.rowcount != 1:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This homepage draft changed in another session. Reload it before publishing.")
    await record_activity(
        db, admin=current_admin, action="storefront_homepage_published",
        entity_type="storefront_homepage", entity_id=1,
        description="Published the storefront homepage.",
        metadata={"draft_version": payload.expected_draft_version, "published_version": record.published_version + 1},
    )
    await db.commit()
    record = await get_homepage_record(db)
    return _homepage_response(record)


@router.post("/storefront-homepage/google-check", response_model=HomepageGoogleCheckResponse)
async def check_storefront_google_readiness(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[Admin, Depends(get_current_superuser)],
):
    record = await ensure_homepage_record(db)
    await db.commit()
    readiness = _google_readiness(StorefrontHomepageContent.model_validate(record.draft_content))
    ready = readiness.ready_for_reviews and readiness.ready_for_map
    if ready:
        try:
            await fetch_google_place(StorefrontHomepageContent.model_validate(record.draft_content).google_place_id or "", "en")
        except GooglePlaceUnavailable:
            return HomepageGoogleCheckResponse(ready=False, message="Google configuration was found, but the approved listing could not be verified safely.")
    return HomepageGoogleCheckResponse(
        ready=ready,
        message=("Google Reviews and Maps configuration is ready for a private check." if ready else "Google integrations remain unavailable until the server gate, approved Place ID, and both restricted keys are configured."),
    )


@router.get("/email-status", response_model=EmailConfigurationStatus)
async def email_status(_: Annotated[Admin, Depends(get_current_superuser)]):
    provider = settings.EMAIL_PROVIDER.lower().strip()
    if provider == "resend":
        delivery_enabled = bool(settings.RESEND_API_KEY.get_secret_value())
        return EmailConfigurationStatus(
            mode="delivery" if delivery_enabled else "not_configured",
            delivery_enabled=delivery_enabled,
            sender=settings.EMAIL_FROM if delivery_enabled else None,
            reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES,
        )
    if provider == "console":
        return EmailConfigurationStatus(mode="test", delivery_enabled=False, reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)
    return EmailConfigurationStatus(mode="not_configured", delivery_enabled=False, reset_link_expiry_minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)


@router.post("/password-reset/{admin_id}", response_model=OwnerPasswordResetResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_owner_password_reset(
    admin_id: int,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_admin: Annotated[Admin, Depends(get_current_superuser)],
):
    await rate_limiter.check(request, "owner-password-reset", PASSWORD_RESET_LIMIT)
    member = await db.get(Admin, admin_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Team member not found.")
    if not member.is_active:
        raise HTTPException(status_code=400, detail="Password reset links can only be sent to active team members.")

    await send_password_setup_email(db, member)
    await record_activity(db, admin=current_admin, action="password_reset_requested", entity_type="admin", entity_id=member.id, description=f"Requested a password reset link for {member.username}.")
    await db.commit()
    return OwnerPasswordResetResponse(message="A secure reset link has been requested for the selected account.")
