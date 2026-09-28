"""Saved WhatsApp reply drafts awaiting human review."""

from alembic import op
import sqlalchemy as sa

revision = "0032_support_drafts"
down_revision = "0031_storefront_checkout"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "support_drafts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("messaging_conversations.id", ondelete="SET NULL"), nullable=True),
        sa.Column("messaging_event_id", sa.Integer(), sa.ForeignKey("messaging_events.id", ondelete="SET NULL"), nullable=True, unique=True),
        sa.Column("support_request_id", sa.Integer(), sa.ForeignKey("support_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("language", sa.String(5), nullable=False),
        sa.Column("customer_message", sa.Text(), nullable=True),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("edited_body", sa.Text(), nullable=True),
        sa.Column("source_ids", sa.JSON(), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("prompt_version", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING_REVIEW"),
        sa.Column("reviewed_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_support_drafts_conversation_id", "support_drafts", ["conversation_id"])
    op.create_index("ix_support_drafts_support_request_id", "support_drafts", ["support_request_id"])
    op.create_index("ix_support_drafts_status", "support_drafts", ["status"])
    op.create_index("ix_support_drafts_created_at", "support_drafts", ["created_at"])
    op.create_index("ix_support_drafts_expires_at", "support_drafts", ["expires_at"])


def downgrade():
    op.drop_index("ix_support_drafts_expires_at", table_name="support_drafts")
    op.drop_index("ix_support_drafts_created_at", table_name="support_drafts")
    op.drop_index("ix_support_drafts_status", table_name="support_drafts")
    op.drop_index("ix_support_drafts_support_request_id", table_name="support_drafts")
    op.drop_index("ix_support_drafts_conversation_id", table_name="support_drafts")
    op.drop_table("support_drafts")
