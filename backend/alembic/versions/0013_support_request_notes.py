import sqlalchemy as sa
from alembic import op


revision = "0013_support_request_notes"
down_revision = "0012_ai_usage_ledger"
branch_labels = None
depends_on = None


def upgrade():
    if "support_request_notes" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "support_request_notes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("support_request_id", sa.Integer, sa.ForeignKey("support_requests.id"), nullable=False),
        sa.Column("author_admin_id", sa.Integer, sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_support_request_notes_support_request_id", "support_request_notes", ["support_request_id"])
    op.create_index("ix_support_request_notes_author_admin_id", "support_request_notes", ["author_admin_id"])
    op.create_index("ix_support_request_notes_created_at", "support_request_notes", ["created_at"])


def downgrade():
    op.drop_index("ix_support_request_notes_created_at", table_name="support_request_notes")
    op.drop_index("ix_support_request_notes_author_admin_id", table_name="support_request_notes")
    op.drop_index("ix_support_request_notes_support_request_id", table_name="support_request_notes")
    op.drop_table("support_request_notes")
