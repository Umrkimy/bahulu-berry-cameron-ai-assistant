import sqlalchemy as sa
from alembic import op


revision = "0014_messaging_adapter"
down_revision = "0013_support_request_notes"
branch_labels = None
depends_on = None


def upgrade():
    if {"messaging_conversations", "messaging_events"}.issubset(set(sa.inspect(op.get_bind()).get_table_names())):
        return
    op.create_table(
        "messaging_conversations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("external_conversation_id", sa.String(160), nullable=False),
        sa.Column("support_request_id", sa.Integer, sa.ForeignKey("support_requests.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("provider", "external_conversation_id", name="uq_messaging_conversation_provider_external_id"),
    )
    op.create_index("ix_messaging_conversations_provider", "messaging_conversations", ["provider"])
    op.create_index("ix_messaging_conversations_support_request_id", "messaging_conversations", ["support_request_id"])
    op.create_table(
        "messaging_events",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("external_message_id", sa.String(160), nullable=False),
        sa.Column("conversation_id", sa.Integer, sa.ForeignKey("messaging_conversations.id"), nullable=False),
        sa.Column("support_request_id", sa.Integer, sa.ForeignKey("support_requests.id")),
        sa.Column("direction", sa.String(20), nullable=False),
        sa.Column("outcome", sa.String(30), nullable=False),
        sa.Column("payload_hash", sa.String(64), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("provider", "external_message_id", name="uq_messaging_event_provider_external_id"),
    )
    op.create_index("ix_messaging_events_provider", "messaging_events", ["provider"])
    op.create_index("ix_messaging_events_conversation_id", "messaging_events", ["conversation_id"])
    op.create_index("ix_messaging_events_support_request_id", "messaging_events", ["support_request_id"])
    op.create_index("ix_messaging_events_processed_at", "messaging_events", ["processed_at"])


def downgrade():
    op.drop_index("ix_messaging_events_processed_at", table_name="messaging_events")
    op.drop_index("ix_messaging_events_support_request_id", table_name="messaging_events")
    op.drop_index("ix_messaging_events_conversation_id", table_name="messaging_events")
    op.drop_index("ix_messaging_events_provider", table_name="messaging_events")
    op.drop_table("messaging_events")
    op.drop_index("ix_messaging_conversations_support_request_id", table_name="messaging_conversations")
    op.drop_index("ix_messaging_conversations_provider", table_name="messaging_conversations")
    op.drop_table("messaging_conversations")
