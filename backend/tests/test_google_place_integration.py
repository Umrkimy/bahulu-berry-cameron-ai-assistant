from copy import deepcopy

import httpx
import pytest
from fastapi import HTTPException
from pydantic import SecretStr
from sqlalchemy import func, select
from starlette.requests import Request
from starlette.responses import Response

from app.api.routes import settings as settings_routes
from app.api.routes import storefront as storefront_routes
from app.core.config import settings
from app.models.admin import Admin
from app.models.storefront_homepage import StorefrontHomepage
from app.schemas.storefront_homepage import HomepagePublishRequest
from app.schemas.storefront_place import StorefrontPlace
from app.services.google_place import GooglePlaceUnavailable, fetch_google_place, google_map_embed_url, normalize_google_place
from app.services.storefront_homepage import DEFAULT_HOMEPAGE_CONTENT, ensure_homepage_record


def public_request(path: str) -> Request:
    return Request({"type": "http", "method": "GET", "path": path, "headers": [], "client": ("127.0.0.1", 28401)})


def google_payload() -> dict:
    reviews = []
    for index in range(5):
        reviews.append({
            "authorAttribution": {"displayName": f"Reviewer {index}", "uri": "https://www.google.com/maps/contrib/test"},
            "rating": 5,
            "relativePublishTimeDescription": "a month ago",
            "text": {"text": f"Approved Google review {index}", "languageCode": "en"},
            "originalText": {"text": f"Ulasan Google diluluskan {index}", "languageCode": "ms"},
            "googleMapsUri": "https://www.google.com/maps/reviews/test",
            "flagContentUri": "https://www.google.com/local/review/rap/report",
        })
    return {
        "displayName": {"text": "Approved Test Listing", "languageCode": "en"},
        "formattedAddress": "Fictional test address",
        "rating": 4.8,
        "userRatingCount": 27,
        "googleMapsLinks": {
            "placeUri": "https://maps.google.com/?cid=test",
            "reviewsUri": "https://maps.google.com/reviews/test",
            "directionsUri": "https://maps.google.com/directions/test",
        },
        "reviews": reviews,
    }


def test_google_place_normalization_is_bounded_and_rejects_untrusted_links():
    place = normalize_google_place(google_payload())
    assert place.display_name == "Approved Test Listing"
    assert len(place.reviews) == 3
    assert place.reviews[0].translated is True

    unsafe = google_payload()
    unsafe["googleMapsLinks"]["placeUri"] = "https://example.test/not-google"
    with pytest.raises(GooglePlaceUnavailable):
        normalize_google_place(unsafe)


@pytest.mark.asyncio
async def test_place_details_request_uses_minimal_fields_and_keeps_key_in_server_header(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED", True)
    monkeypatch.setattr(settings, "GOOGLE_PLACES_API_KEY", SecretStr("fictional-server-key"))

    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/v1/places/approved-test-place"
        assert request.url.params["languageCode"] == "ms"
        assert request.url.params["regionCode"] == "MY"
        assert request.headers["X-Goog-Api-Key"] == "fictional-server-key"
        assert "reviews" in request.headers["X-Goog-FieldMask"]
        assert "fictional-server-key" not in str(request.url)
        return httpx.Response(200, json=google_payload())

    result = await fetch_google_place(
        "approved-test-place",
        "ms",
        transport=httpx.MockTransport(handler),
    )
    assert result.review_count == 27


@pytest.mark.asyncio
async def test_google_public_endpoints_are_hidden_without_server_gate_and_do_not_mutate(session):
    before = await session.scalar(select(func.count()).select_from(StorefrontHomepage))
    place_response = Response()
    with pytest.raises(HTTPException) as place_error:
        await storefront_routes.public_storefront_place(public_request("/api/storefront/place"), session, place_response, "en")
    map_response = Response()
    with pytest.raises(HTTPException) as map_error:
        await storefront_routes.public_storefront_map(public_request("/api/storefront/map"), session, map_response, "en")
    after = await session.scalar(select(func.count()).select_from(StorefrontHomepage))

    assert place_error.value.status_code == map_error.value.status_code == 404
    assert place_error.value.headers == map_error.value.headers == {"Cache-Control": "no-store"}
    assert place_response.headers["cache-control"] == map_response.headers["cache-control"] == "no-store"
    assert before == after == 0


@pytest.mark.asyncio
async def test_public_homepage_masks_previously_published_google_sections_when_gate_is_off(session):
    record = await ensure_homepage_record(session)
    content = deepcopy(DEFAULT_HOMEPAGE_CONTENT)
    content["reviews"]["enabled"] = True
    content["location"]["enabled"] = True
    content["google_place_id"] = "approved-test-place"
    record.published_content = content
    await session.commit()

    result = await storefront_routes.public_storefront_homepage(
        public_request("/api/storefront/homepage"), session, Response(),
    )
    assert result.reviews.enabled is False
    assert result.location.enabled is False


@pytest.mark.asyncio
async def test_enabled_place_endpoint_returns_safe_normalized_content(monkeypatch, session):
    record = await ensure_homepage_record(session)
    content = deepcopy(DEFAULT_HOMEPAGE_CONTENT)
    content["reviews"]["enabled"] = True
    content["reviews"]["eyebrow"] = {"en": "Reviews", "ms": "Ulasan"}
    content["reviews"]["title"] = {"en": "Google reviews", "ms": "Ulasan Google"}
    content["google_place_id"] = "approved-test-place"
    record.published_content = content
    await session.commit()
    monkeypatch.setattr(settings, "STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED", True)

    expected = normalize_google_place(google_payload())

    async def fake_fetch(place_id: str, locale: str) -> StorefrontPlace:
        assert (place_id, locale) == ("approved-test-place", "ms")
        return expected

    monkeypatch.setattr(storefront_routes, "fetch_google_place", fake_fetch)
    response = Response()
    result = await storefront_routes.public_storefront_place(public_request("/api/storefront/place"), session, response, "ms")
    assert result == expected
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.asyncio
async def test_google_failure_is_safe_and_not_cached(monkeypatch, session):
    record = await ensure_homepage_record(session)
    content = deepcopy(DEFAULT_HOMEPAGE_CONTENT)
    content["location"]["enabled"] = True
    content["google_place_id"] = "approved-test-place"
    record.published_content = content
    await session.commit()
    monkeypatch.setattr(settings, "STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED", True)

    async def unavailable(*_args):
        raise GooglePlaceUnavailable()

    monkeypatch.setattr(storefront_routes, "fetch_google_place", unavailable)
    response = Response()
    with pytest.raises(HTTPException) as error:
        await storefront_routes.public_storefront_place(public_request("/api/storefront/place"), session, response, "en")
    assert error.value.status_code == 503
    assert error.value.detail == "Google place information is temporarily unavailable."
    assert error.value.headers == {"Cache-Control": "no-store"}
    assert response.headers["cache-control"] == "no-store"


def test_map_embed_requires_server_gate_and_uses_separate_key(monkeypatch):
    monkeypatch.setattr(settings, "STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED", True)
    monkeypatch.setattr(settings, "GOOGLE_MAPS_EMBED_API_KEY", SecretStr("fictional-embed-key"))
    url = google_map_embed_url("approved-test-place", "ms")
    assert url.startswith("https://www.google.com/maps/embed/v1/place?")
    assert "place_id%3Aapproved-test-place" in url
    assert "language=ms" in url


@pytest.mark.asyncio
async def test_publish_verifies_enabled_listing_before_copying_snapshot(monkeypatch, session):
    admin = Admin(username="google-owner", email="google-owner@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(admin)
    await session.flush()
    record = await ensure_homepage_record(session)
    content = deepcopy(DEFAULT_HOMEPAGE_CONTENT)
    content["reviews"].update({
        "enabled": True,
        "eyebrow": {"en": "Reviews", "ms": "Ulasan"},
        "title": {"en": "Verified reviews", "ms": "Ulasan disahkan"},
    })
    content["google_place_id"] = "approved-test-place"
    record.draft_content = content
    await session.commit()

    monkeypatch.setattr(settings, "STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED", True)
    monkeypatch.setattr(settings, "GOOGLE_PLACES_API_KEY", SecretStr("fictional-server-key"))
    monkeypatch.setattr(settings, "GOOGLE_MAPS_EMBED_API_KEY", SecretStr("fictional-embed-key"))
    checked = []

    async def verified(place_id: str, locale: str) -> StorefrontPlace:
        checked.append((place_id, locale))
        return normalize_google_place(google_payload())

    monkeypatch.setattr(settings_routes, "fetch_google_place", verified)
    published = await settings_routes.publish_storefront_homepage(
        HomepagePublishRequest(expected_draft_version=record.draft_version), session, admin,
    )
    assert checked == [("approved-test-place", "en")]
    assert published.published.reviews.enabled is True
