import csv
import io
from decimal import Decimal

import pytest

from app.api.routes.exports import export_csv
from app.models.admin import Admin
from app.models.customer import Customer
from app.utils.csv_safety import csv_safe_cell


@pytest.mark.parametrize("value", ["=1+1", "+60123", "-2", "@SUM(A1)", "\tcmd", "\rcmd"])
def test_formula_like_text_is_neutralised(value):
    assert csv_safe_cell(value) == f"'{value}"


@pytest.mark.parametrize("value", ["Kek Bahulu", "", -2, Decimal("-1.50"), None])
def test_ordinary_values_are_unchanged(value):
    assert csv_safe_cell(value) == value


@pytest.mark.asyncio
async def test_customer_export_cannot_inject_spreadsheet_formulas(session):
    owner = Admin(username="Fictional Owner", email="owner@example.invalid", password_hash="x", role="OWNER")
    customer = Customer(full_name='=HYPERLINK("https://example.invalid","Open")', phone_number="0123456789")
    session.add_all([owner, customer])
    await session.commit()

    response = await export_csv("customers", session, owner, ids=None)
    body = "".join([chunk if isinstance(chunk, str) else chunk.decode() async for chunk in response.body_iterator])
    rows = list(csv.reader(io.StringIO(body)))

    assert rows[1][1].startswith("'=HYPERLINK")
