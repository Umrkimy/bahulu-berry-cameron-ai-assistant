"""Customer accounts for the website.

- ``customer_accounts``: one row per verified customer email, with an
  optional password hash and a session version for sign-out everywhere.
- ``customer_sign_in_codes``: one-time six-digit codes, stored as HMACs.

Orders are matched to accounts by verified email, so no order rows change.
"""

from alembic import op
import sqlalchemy as sa

revision = "0036_customer_accounts"
down_revision = "0035_customer_status_emails"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "customer_accounts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=True),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("locale", sa.String(2), nullable=False, server_default="en"),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_sign_in_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_customer_accounts_email", "customer_accounts", ["email"], unique=True)
    op.create_table(
        "customer_sign_in_codes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_customer_sign_in_codes_email", "customer_sign_in_codes", ["email"])
    op.create_index("ix_customer_sign_in_codes_expires_at", "customer_sign_in_codes", ["expires_at"])


def downgrade():
    op.drop_index("ix_customer_sign_in_codes_expires_at", table_name="customer_sign_in_codes")
    op.drop_index("ix_customer_sign_in_codes_email", table_name="customer_sign_in_codes")
    op.drop_table("customer_sign_in_codes")
    op.drop_index("ix_customer_accounts_email", table_name="customer_accounts")
    op.drop_table("customer_accounts")
