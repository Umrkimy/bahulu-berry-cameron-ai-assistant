from typing import Any
from urllib.parse import quote, urlencode, urlparse

import httpx

from app.core.config import settings
from app.schemas.storefront_place import StorefrontPlace, StorefrontReview


PLACE_FIELDS = "displayName,formattedAddress,rating,userRatingCount,googleMapsLinks,reviews"


class GooglePlaceUnavailable(Exception):
    pass


def _google_url(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    parsed = urlparse(value)
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or not (hostname == "google.com" or hostname.endswith(".google.com") or hostname == "goo.gl"):
        return None
    return value[:2000]


def _localized_text(value: Any) -> tuple[str, str | None]:
    if not isinstance(value, dict):
        return "", None
    text = value.get("text")
    language = value.get("languageCode")
    return (text[:4000] if isinstance(text, str) else "", language[:20] if isinstance(language, str) else None)


def normalize_google_place(payload: dict[str, Any]) -> StorefrontPlace:
    display_name, _ = _localized_text(payload.get("displayName"))
    links = payload.get("googleMapsLinks") if isinstance(payload.get("googleMapsLinks"), dict) else {}
    place_uri = _google_url(links.get("placeUri"))
    reviews_uri = _google_url(links.get("reviewsUri")) or place_uri
    directions_uri = _google_url(links.get("directionsUri")) or place_uri
    if not display_name or not place_uri or not reviews_uri or not directions_uri:
        raise GooglePlaceUnavailable()

    reviews: list[StorefrontReview] = []
    for raw in payload.get("reviews", [])[:3] if isinstance(payload.get("reviews"), list) else []:
        if not isinstance(raw, dict):
            continue
        text, language = _localized_text(raw.get("text"))
        original, original_language = _localized_text(raw.get("originalText"))
        author = raw.get("authorAttribution") if isinstance(raw.get("authorAttribution"), dict) else {}
        author_name = author.get("displayName") if isinstance(author.get("displayName"), str) else "Google user"
        rating = raw.get("rating")
        relative_time = raw.get("relativePublishTimeDescription")
        if not text or not isinstance(rating, (int, float)) or not isinstance(relative_time, str):
            continue
        reviews.append(StorefrontReview(
            author_name=author_name[:200], author_uri=_google_url(author.get("uri")), rating=float(rating),
            text=text, relative_time=relative_time[:200], review_uri=_google_url(raw.get("googleMapsUri")),
            report_uri=_google_url(raw.get("flagContentUri")),
            translated=bool(original and (text != original or (language and original_language and language != original_language))),
            original_language=original_language,
        ))

    rating = payload.get("rating")
    review_count = payload.get("userRatingCount")
    address = payload.get("formattedAddress")
    return StorefrontPlace(
        display_name=display_name[:300], formatted_address=address[:500] if isinstance(address, str) else "",
        rating=float(rating) if isinstance(rating, (int, float)) and rating >= 1 else None,
        review_count=review_count if isinstance(review_count, int) and review_count >= 0 else 0,
        place_uri=place_uri, reviews_uri=reviews_uri, directions_uri=directions_uri, reviews=reviews,
        sorting_notice="Google selects and orders the reviews returned by Place Details.",
    )


async def fetch_google_place(
    place_id: str,
    locale: str,
    *,
    transport: httpx.AsyncBaseTransport | None = None,
) -> StorefrontPlace:
    if not settings.STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED or not settings.GOOGLE_PLACES_API_KEY.get_secret_value():
        raise GooglePlaceUnavailable()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(5.0), follow_redirects=False, transport=transport) as client:
            response = await client.get(
                f"https://places.googleapis.com/v1/places/{quote(place_id, safe='')}",
                params={"languageCode": locale, "regionCode": "MY"},
                headers={"X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY.get_secret_value(), "X-Goog-FieldMask": PLACE_FIELDS},
            )
            response.raise_for_status()
            payload = response.json()
    except (httpx.HTTPError, ValueError, TypeError) as error:
        raise GooglePlaceUnavailable() from error
    if not isinstance(payload, dict):
        raise GooglePlaceUnavailable()
    return normalize_google_place(payload)


def google_map_embed_url(place_id: str, locale: str) -> str:
    key = settings.GOOGLE_MAPS_EMBED_API_KEY.get_secret_value()
    if not settings.STOREFRONT_GOOGLE_INTEGRATIONS_ENABLED or not key:
        raise GooglePlaceUnavailable()
    query = urlencode({"key": key, "q": f"place_id:{place_id}", "language": locale, "region": "MY"})
    return f"https://www.google.com/maps/embed/v1/place?{query}"
