"""Validation for Owner product CSV imports. Uploaded files are never stored."""

from __future__ import annotations

import csv
import io
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.schemas.product_import import ProductImportIssue, ProductImportPreview, ProductImportRow


CSV_HEADERS = ("name", "category", "description", "price_myr", "opening_stock", "low_stock_threshold")
MAX_IMPORT_BYTES = 1_000_000
MAX_IMPORT_ROWS = 500


def _issue(row_number: int | None, field: str | None, message: str) -> ProductImportIssue:
    return ProductImportIssue(row_number=row_number, field=field, message=message)


def _optional(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def _positive_price(value: str | None) -> Decimal:
    raw = (value or "").strip()
    if not raw:
        raise ValueError("Price is required.")
    if raw.startswith("RM") or "," in raw:
        raise ValueError("Use a plain RM amount such as 12.50.")
    try:
        price = Decimal(raw)
    except InvalidOperation as error:
        raise ValueError("Price must be a number.") from error
    if not price.is_finite() or price <= 0:
        raise ValueError("Price must be greater than zero.")
    if -price.as_tuple().exponent > 2 or len(price.as_tuple().digits) > 10:
        raise ValueError("Price can contain at most 10 digits and 2 decimal places.")
    return price


def _whole_number(value: str | None, *, field_label: str, default: int | None = None) -> int:
    raw = (value or "").strip()
    if not raw and default is not None:
        return default
    if not raw:
        raise ValueError(f"{field_label} is required.")
    if not raw.isdecimal():
        raise ValueError(f"{field_label} must be a whole number.")
    return int(raw)


async def read_product_import(file: UploadFile, db: AsyncSession) -> ProductImportPreview:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose a .csv file.")

    contents = await file.read(MAX_IMPORT_BYTES + 1)
    if len(contents) > MAX_IMPORT_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="CSV files must be 1 MB or smaller.")
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="CSV files must use UTF-8 encoding.") from error

    try:
        reader = csv.DictReader(io.StringIO(text))
    except csv.Error as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="The CSV file could not be read.") from error

    headers = tuple((header or "").strip() for header in (reader.fieldnames or ()))
    if headers != CSV_HEADERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Use the downloaded CSV template headers in the same order.", "expected_headers": CSV_HEADERS},
        )

    rows: list[ProductImportRow] = []
    errors: list[ProductImportIssue] = []
    names: dict[str, int] = {}
    for row_number, raw_row in enumerate(reader, start=2):
        if row_number - 1 > MAX_IMPORT_ROWS:
            errors.append(_issue(None, None, f"CSV files can contain at most {MAX_IMPORT_ROWS} product rows."))
            break
        if not any((value or "").strip() for value in raw_row.values()):
            continue
        name = _optional(raw_row.get("name"))
        row_errors: list[ProductImportIssue] = []
        if not name:
            row_errors.append(_issue(row_number, "name", "Product name is required."))
        elif len(name) > 100:
            row_errors.append(_issue(row_number, "name", "Product name must be 100 characters or fewer."))
        category = _optional(raw_row.get("category"))
        if category and len(category) > 50:
            row_errors.append(_issue(row_number, "category", "Category must be 50 characters or fewer."))
        try:
            price = _positive_price(raw_row.get("price_myr"))
        except ValueError as error:
            row_errors.append(_issue(row_number, "price_myr", str(error)))
            price = Decimal("0")
        try:
            opening_stock = _whole_number(raw_row.get("opening_stock"), field_label="Opening stock")
        except ValueError as error:
            row_errors.append(_issue(row_number, "opening_stock", str(error)))
            opening_stock = 0
        try:
            low_stock_threshold = _whole_number(raw_row.get("low_stock_threshold"), field_label="Low-stock threshold", default=10)
        except ValueError as error:
            row_errors.append(_issue(row_number, "low_stock_threshold", str(error)))
            low_stock_threshold = 10
        if name:
            normalized_name = name.casefold()
            if normalized_name in names:
                row_errors.append(_issue(row_number, "name", f"Duplicate product name; it also appears on row {names[normalized_name]}."))
            else:
                names[normalized_name] = row_number
        errors.extend(row_errors)
        if not row_errors and name:
            rows.append(ProductImportRow(
                row_number=row_number,
                name=name,
                category=category,
                description=_optional(raw_row.get("description")),
                price_myr=price,
                opening_stock=opening_stock,
                low_stock_threshold=low_stock_threshold,
            ))

    if not rows and not errors:
        errors.append(_issue(None, None, "Add at least one product row before importing."))
    if rows:
        existing_names = set((await db.scalars(select(Product.name).where(func.lower(Product.name).in_([row.name.lower() for row in rows])))).all())
        existing_normalized = {name.casefold() for name in existing_names}
        for row in rows:
            if row.name.casefold() in existing_normalized:
                errors.append(_issue(row.row_number, "name", "A product with this name already exists."))

    return ProductImportPreview(rows=rows, errors=errors, can_import=not errors and bool(rows))
