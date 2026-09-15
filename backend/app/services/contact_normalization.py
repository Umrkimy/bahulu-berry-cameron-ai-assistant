"""Canonical customer contact handling for internal operational workflows."""

from __future__ import annotations

import re


class ContactNormalizationError(ValueError):
    def __init__(self, field: str, message: str) -> None:
        super().__init__(message)
        self.field = field
        self.message = message


def normalize_phone_number(value: str) -> str:
    """Return a comparison-safe E.164 phone number.

    Malaysian local numbers may be entered with spaces, dashes, or parentheses.
    Other countries must be supplied with an explicit ``+`` country code so a
    local-looking number is never accidentally assigned the wrong country.
    """
    raw = value.strip()
    if not raw:
        raise ContactNormalizationError("phone_number", "Phone number is required.")

    compact = re.sub(r"[\s().-]", "", raw)
    if compact.startswith("+"):
        if not re.fullmatch(r"\+[1-9]\d{7,14}", compact):
            raise ContactNormalizationError(
                "phone_number",
                "Use a valid international number beginning with +.",
            )
        return compact

    if not re.fullmatch(r"0\d{9,10}", compact):
        raise ContactNormalizationError(
            "phone_number",
            "Use a Malaysian number such as 012-345 6789, or an international number beginning with +.",
        )
    return f"+6{compact}"


def normalize_email(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None
