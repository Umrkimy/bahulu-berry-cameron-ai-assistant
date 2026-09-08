from decimal import Decimal

from pydantic import BaseModel, Field


class ProductImportRow(BaseModel):
    row_number: int
    name: str
    category: str | None = None
    description: str | None = None
    price_myr: Decimal
    opening_stock: int
    low_stock_threshold: int = 10


class ProductImportIssue(BaseModel):
    row_number: int | None = None
    field: str | None = None
    message: str


class ProductImportPreview(BaseModel):
    rows: list[ProductImportRow] = Field(default_factory=list)
    errors: list[ProductImportIssue] = Field(default_factory=list)
    can_import: bool


class ProductImportResult(BaseModel):
    imported_count: int
    message: str
