"""add canonical customer contacts and archival

Revision ID: 0026_customer_retention_contacts
Revises: 0025_semantic_support_knowledge
"""

from __future__ import annotations

import re
from collections import defaultdict

from alembic import op
import sqlalchemy as sa


revision = "0026_customer_retention_contacts"
down_revision = "0025_semantic_support_knowledge"
branch_labels = None
depends_on = None


def _phone(value: str) -> str:
    compact = re.sub(r"[\s().-]", "", value.strip())
    if compact.startswith("+") and re.fullmatch(r"\+[1-9]\d{7,14}", compact):
        return compact
    if re.fullmatch(r"0\d{9,10}", compact):
        return f"+6{compact}"
    raise ValueError("invalid phone format")


def _email(value: str | None) -> str | None:
    return value.strip().lower() if value and value.strip() else None


def upgrade() -> None:
    op.add_column("customers", sa.Column("canonical_phone_number", sa.String(length=20), nullable=True))
    op.add_column("customers", sa.Column("canonical_email", sa.String(length=255), nullable=True))
    op.add_column("customers", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("customers", sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, phone_number, email FROM customers ORDER BY id")).mappings().all()
    phones: dict[str, list[int]] = defaultdict(list)
    emails: dict[str, list[int]] = defaultdict(list)
    normalized: list[tuple[int, str, str | None]] = []
    invalid: list[int] = []
    for row in rows:
        try:
            phone = _phone(row["phone_number"])
        except ValueError:
            invalid.append(row["id"])
            continue
        email = _email(row["email"])
        phones[phone].append(row["id"])
        if email:
            emails[email].append(row["id"])
        normalized.append((row["id"], phone, email))

    collisions = [f"phone {value}: {ids}" for value, ids in phones.items() if len(ids) > 1]
    collisions += [f"email {value}: {ids}" for value, ids in emails.items() if len(ids) > 1]
    if invalid or collisions:
        problems = []
        if invalid:
            problems.append(f"invalid phone format for customer IDs {invalid}")
        if collisions:
            problems.append("canonical contact collisions: " + "; ".join(collisions))
        raise RuntimeError("Customer contact migration stopped; resolve records manually: " + ". ".join(problems))

    for customer_id, phone, email in normalized:
        connection.execute(
            sa.text("UPDATE customers SET phone_number = :phone, email = :email, canonical_phone_number = :phone, canonical_email = :email WHERE id = :id"),
            {"id": customer_id, "phone": phone, "email": email},
        )

    op.alter_column("customers", "canonical_phone_number", nullable=False)
    op.create_index("uq_customers_canonical_phone_number", "customers", ["canonical_phone_number"], unique=True)
    op.create_index("uq_customers_canonical_email", "customers", ["canonical_email"], unique=True)
    op.create_index("ix_customers_is_archived", "customers", ["is_archived"])


def downgrade() -> None:
    op.drop_index("ix_customers_is_archived", table_name="customers")
    op.drop_index("uq_customers_canonical_email", table_name="customers")
    op.drop_index("uq_customers_canonical_phone_number", table_name="customers")
    op.drop_column("customers", "archived_at")
    op.drop_column("customers", "is_archived")
    op.drop_column("customers", "canonical_email")
    op.drop_column("customers", "canonical_phone_number")
