from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class BilingualText(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    en: str = Field(default="", max_length=800)
    ms: str = Field(default="", max_length=800)


class HomepageHero(BaseModel):
    eyebrow: BilingualText
    title_primary: BilingualText
    title_accent: BilingualText
    title_suffix: BilingualText
    body: BilingualText
    cta_label: BilingualText


class HomepageBenefit(BaseModel):
    title: BilingualText
    body: BilingualText


class HomepageBenefits(BaseModel):
    enabled: bool = False
    eyebrow: BilingualText
    title: BilingualText
    items: list[HomepageBenefit] = Field(min_length=3, max_length=3)


class HomepageCollection(BaseModel):
    eyebrow: BilingualText
    title: BilingualText
    view_all_label: BilingualText


class HomepageStory(BaseModel):
    eyebrow: BilingualText
    title: BilingualText
    body: BilingualText
    cta_label: BilingualText


class HomepageReviews(BaseModel):
    enabled: bool = False
    eyebrow: BilingualText
    title: BilingualText


class HomepageLocation(BaseModel):
    enabled: bool = False
    eyebrow: BilingualText
    title: BilingualText
    load_map_label: BilingualText
    directions_label: BilingualText


class HomepageClosing(BaseModel):
    eyebrow: BilingualText
    title: BilingualText
    body: BilingualText
    cta_label: BilingualText


class StorefrontHomepageContent(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    hero: HomepageHero
    benefits: HomepageBenefits
    collection: HomepageCollection
    story: HomepageStory
    reviews: HomepageReviews
    location: HomepageLocation
    closing: HomepageClosing
    google_place_id: str | None = Field(default=None, max_length=255, pattern=r"^[A-Za-z0-9_-]+$")

    @field_validator("google_place_id", mode="before")
    @classmethod
    def empty_place_id_is_none(cls, value: str | None):
        return value.strip() or None if isinstance(value, str) else value

    @model_validator(mode="after")
    def bound_text_by_purpose(self):
        short_fields = [
            self.hero.eyebrow, self.hero.title_primary, self.hero.title_accent, self.hero.title_suffix, self.hero.cta_label,
            self.benefits.eyebrow, self.benefits.title, self.collection.eyebrow, self.collection.title,
            self.collection.view_all_label, self.story.eyebrow, self.story.title, self.story.cta_label,
            self.reviews.eyebrow, self.reviews.title, self.location.eyebrow, self.location.title,
            self.location.load_map_label, self.location.directions_label, self.closing.eyebrow,
            self.closing.title, self.closing.cta_label,
            *[item.title for item in self.benefits.items],
        ]
        if any(len(value) > 120 for field in short_fields for value in (field.en, field.ms)):
            raise ValueError("Headings and labels must be 120 characters or fewer.")
        return self


class HomepageDraftUpdate(BaseModel):
    expected_version: int = Field(ge=1)
    content: StorefrontHomepageContent


class HomepagePublishRequest(BaseModel):
    expected_draft_version: int = Field(ge=1)


class GoogleReadiness(BaseModel):
    integrations_enabled: bool
    places_key_configured: bool
    maps_embed_key_configured: bool
    place_id_configured: bool
    ready_for_reviews: bool
    ready_for_map: bool


class HomepageAdminResponse(BaseModel):
    draft: StorefrontHomepageContent
    published: StorefrontHomepageContent
    draft_version: int
    published_version: int
    updated_at: datetime | None
    published_at: datetime | None
    google_readiness: GoogleReadiness


class HomepageGoogleCheckResponse(BaseModel):
    ready: bool
    message: str


def publication_issues(content: StorefrontHomepageContent, readiness: GoogleReadiness) -> list[str]:
    required = [
        content.hero.eyebrow, content.hero.title_primary, content.hero.title_accent, content.hero.title_suffix,
        content.hero.body, content.hero.cta_label, content.collection.eyebrow, content.collection.title,
        content.collection.view_all_label, content.story.eyebrow, content.story.title, content.story.body,
        content.story.cta_label, content.closing.eyebrow, content.closing.title, content.closing.body,
        content.closing.cta_label,
    ]
    issues = []
    if any(not value.en or not value.ms for value in required):
        issues.append("Complete all required English and Bahasa Melayu content before publishing.")
    if content.benefits.enabled:
        benefit_fields = [content.benefits.eyebrow, content.benefits.title, *[value for item in content.benefits.items for value in (item.title, item.body)]]
        if any(not value.en or not value.ms for value in benefit_fields):
            issues.append("Complete all English and Bahasa Melayu benefit content or disable the section.")
    if content.reviews.enabled and not readiness.ready_for_reviews:
        issues.append("Google Reviews cannot be enabled until the approved integration is ready.")
    if content.reviews.enabled:
        review_fields = [content.reviews.eyebrow, content.reviews.title]
        if any(not value.en or not value.ms for value in review_fields):
            issues.append("Complete all English and Bahasa Melayu review content or disable the section.")
    if content.location.enabled:
        location_fields = [content.location.eyebrow, content.location.title, content.location.load_map_label, content.location.directions_label]
        if any(not value.en or not value.ms for value in location_fields):
            issues.append("Complete all English and Bahasa Melayu location content or disable the section.")
        if not readiness.ready_for_map:
            issues.append("Google Maps cannot be enabled until the approved integration is ready.")
    return issues
