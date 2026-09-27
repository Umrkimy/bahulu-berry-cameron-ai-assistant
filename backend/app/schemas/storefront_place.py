from pydantic import BaseModel, Field


class StorefrontReview(BaseModel):
    author_name: str = Field(max_length=200)
    author_uri: str | None = Field(default=None, max_length=2000)
    rating: float = Field(ge=1, le=5)
    text: str = Field(max_length=4000)
    relative_time: str = Field(max_length=200)
    review_uri: str | None = Field(default=None, max_length=2000)
    report_uri: str | None = Field(default=None, max_length=2000)
    translated: bool = False
    original_language: str | None = Field(default=None, max_length=20)


class StorefrontPlace(BaseModel):
    display_name: str = Field(max_length=300)
    formatted_address: str = Field(max_length=500)
    rating: float | None = Field(default=None, ge=1, le=5)
    review_count: int = Field(default=0, ge=0)
    place_uri: str = Field(max_length=2000)
    reviews_uri: str = Field(max_length=2000)
    directions_uri: str = Field(max_length=2000)
    reviews: list[StorefrontReview] = Field(max_length=3)
    provider: str = "Google"
    sorting_notice: str


class StorefrontMap(BaseModel):
    embed_url: str = Field(max_length=3000)
