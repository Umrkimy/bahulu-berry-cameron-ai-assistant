from copy import deepcopy

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes.settings import (
    get_storefront_homepage_settings,
    publish_storefront_homepage,
    update_storefront_homepage_draft,
)
from app.api.routes.storefront import public_storefront_homepage
from app.models.activity_log import ActivityLog
from app.models.admin import Admin
from app.models.storefront_homepage import StorefrontHomepage
from app.schemas.storefront_homepage import HomepageDraftUpdate, HomepagePublishRequest
from app.services.storefront_homepage import DEFAULT_HOMEPAGE_CONTENT


def storefront_request() -> Request:
    return Request({"type": "http", "method": "GET", "path": "/api/storefront/homepage", "headers": [], "client": ("127.0.0.1", 27301)})


async def owner(session) -> Admin:
    admin = Admin(username="homepage-owner", email="homepage-owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(admin)
    await session.commit()
    return admin


@pytest.mark.asyncio
async def test_homepage_draft_is_private_until_atomic_publish_and_is_audited(session):
    admin = await owner(session)
    initial = await get_storefront_homepage_settings(session, admin)
    content = deepcopy(initial.draft.model_dump())
    content["hero"]["body"]["en"] = "Fictional private draft wording."

    saved = await update_storefront_homepage_draft(
        HomepageDraftUpdate(expected_version=initial.draft_version, content=content), session, admin,
    )
    assert saved.draft.hero.body.en == "Fictional private draft wording."
    assert saved.published.hero.body.en != saved.draft.hero.body.en

    public_before = await public_storefront_homepage(storefront_request(), session, Response())
    assert public_before.hero.body.en != saved.draft.hero.body.en

    published = await publish_storefront_homepage(
        HomepagePublishRequest(expected_draft_version=saved.draft_version), session, admin,
    )
    assert published.published.hero.body.en == "Fictional private draft wording."
    public_after = await public_storefront_homepage(storefront_request(), session, Response())
    assert public_after.hero.body.en == "Fictional private draft wording."
    actions = (await session.execute(select(ActivityLog.action).where(ActivityLog.entity_type == "storefront_homepage").order_by(ActivityLog.id))).scalars().all()
    assert actions == ["storefront_homepage_draft_saved", "storefront_homepage_published"]


@pytest.mark.asyncio
async def test_homepage_rejects_stale_writes_and_incomplete_bilingual_publish(session):
    admin = await owner(session)
    initial = await get_storefront_homepage_settings(session, admin)
    content = deepcopy(initial.draft.model_dump())
    content["closing"]["title"]["ms"] = ""
    saved = await update_storefront_homepage_draft(
        HomepageDraftUpdate(expected_version=initial.draft_version, content=content), session, admin,
    )

    with pytest.raises(HTTPException) as stale:
        await update_storefront_homepage_draft(
            HomepageDraftUpdate(expected_version=initial.draft_version, content=content), session, admin,
        )
    assert stale.value.status_code == 409

    with pytest.raises(HTTPException) as incomplete:
        await publish_storefront_homepage(
            HomepagePublishRequest(expected_draft_version=saved.draft_version), session, admin,
        )
    assert incomplete.value.status_code == 422
    assert "Bahasa Melayu" in str(incomplete.value.detail)


@pytest.mark.asyncio
async def test_public_homepage_read_has_no_mutation_and_no_store(session):
    response = Response()
    before = await session.scalar(select(func.count()).select_from(StorefrontHomepage))
    content = await public_storefront_homepage(storefront_request(), session, response)
    after = await session.scalar(select(func.count()).select_from(StorefrontHomepage))

    assert before == after == 0
    assert content.hero.title_accent.en == DEFAULT_HOMEPAGE_CONTENT["hero"]["title_accent"]["en"]
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_google_sections_cannot_publish_while_server_gate_is_disabled(session):
    admin = await owner(session)
    initial = await get_storefront_homepage_settings(session, admin)
    content = deepcopy(initial.draft.model_dump())
    content["reviews"]["enabled"] = True
    content["reviews"]["eyebrow"] = {"en": "REVIEWS", "ms": "ULASAN"}
    content["reviews"]["title"] = {"en": "Approved heading", "ms": "Tajuk diluluskan"}
    content["google_place_id"] = "fictional-place-id"
    saved = await update_storefront_homepage_draft(
        HomepageDraftUpdate(expected_version=initial.draft_version, content=content), session, admin,
    )

    with pytest.raises(HTTPException) as blocked:
        await publish_storefront_homepage(HomepagePublishRequest(expected_draft_version=saved.draft_version), session, admin)
    assert blocked.value.status_code == 422
    assert "Google Reviews" in str(blocked.value.detail)
