import sqlalchemy as sa
from alembic import op


revision = "0015_human_takeover"
down_revision = "0014_messaging_adapter"
branch_labels = None
depends_on = None


def _columns(table_name: str) -> set[str]:
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade():
    support_columns = _columns("support_requests")
    if "handoff_state" not in support_columns:
        op.add_column("support_requests", sa.Column("handoff_state", sa.String(30), nullable=False, server_default="AI_ACTIVE"))
        op.create_index("ix_support_requests_handoff_state", "support_requests", ["handoff_state"])

    conversation_columns = _columns("messaging_conversations")
    if "contact_reference" not in conversation_columns:
        op.add_column("messaging_conversations", sa.Column("contact_reference", sa.String(160), nullable=True))

    event_columns = _columns("messaging_events")
    if "content" not in event_columns:
        op.add_column("messaging_events", sa.Column("content", sa.Text, nullable=True))
    if "author_admin_id" not in event_columns:
        op.add_column("messaging_events", sa.Column("author_admin_id", sa.Integer, nullable=True))
        op.create_index("ix_messaging_events_author_admin_id", "messaging_events", ["author_admin_id"])
    if "expires_at" not in event_columns:
        op.add_column("messaging_events", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index("ix_messaging_events_expires_at", "messaging_events", ["expires_at"])


def downgrade():
    op.drop_index("ix_messaging_events_expires_at", table_name="messaging_events")
    op.drop_column("messaging_events", "expires_at")
    op.drop_index("ix_messaging_events_author_admin_id", table_name="messaging_events")
    op.drop_column("messaging_events", "author_admin_id")
    op.drop_column("messaging_events", "content")
    op.drop_column("messaging_conversations", "contact_reference")
    op.drop_index("ix_support_requests_handoff_state", table_name="support_requests")
    op.drop_column("support_requests", "handoff_state")
