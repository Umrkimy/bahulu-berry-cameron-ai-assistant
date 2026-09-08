import sqlalchemy as sa
from alembic import op

revision = "0022_email_delivery"
down_revision = "0021_storefront_products"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("admins", sa.Column("session_version", sa.Integer(), nullable=False, server_default="1"))
    op.create_table("password_reset_tokens", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=False), sa.Column("token_hash", sa.String(64), nullable=False, unique=True), sa.Column("purpose", sa.String(30), nullable=False), sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("used_at", sa.DateTime(timezone=True)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_index("ix_password_reset_tokens_admin_id", "password_reset_tokens", ["admin_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"])
    op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"])
    op.create_table("email_deliveries", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("recipient_admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=False), sa.Column("email_type", sa.String(60), nullable=False), sa.Column("idempotency_key", sa.String(180), unique=True), sa.Column("status", sa.String(20), nullable=False), sa.Column("provider_message_id", sa.String(120)), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.Column("sent_at", sa.DateTime(timezone=True)))
    for name, col in (("ix_email_deliveries_recipient_admin_id", "recipient_admin_id"), ("ix_email_deliveries_email_type", "email_type"), ("ix_email_deliveries_status", "status")):
        op.create_index(name, "email_deliveries", [col])


def downgrade():
    op.drop_table("email_deliveries")
    op.drop_table("password_reset_tokens")
    op.drop_column("admins", "session_version")
