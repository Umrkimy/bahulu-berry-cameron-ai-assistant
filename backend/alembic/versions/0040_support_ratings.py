"""Customer ratings of staff after a WhatsApp chat."""

from alembic import op
import sqlalchemy as sa

revision = "0040_support_ratings"
down_revision = "0039_message_delivery_error"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "support_ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("messaging_conversations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("support_request_id", sa.Integer(), sa.ForeignKey("support_requests.id", ondelete="SET NULL"), nullable=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="CASCADE"), nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("flagged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("asked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("rated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_support_ratings_conversation_id", "support_ratings", ["conversation_id"])
    op.create_index("ix_support_ratings_support_request_id", "support_ratings", ["support_request_id"])
    op.create_index("ix_support_ratings_admin_id", "support_ratings", ["admin_id"])
    op.create_index("ix_support_ratings_asked_at", "support_ratings", ["asked_at"])


def downgrade():
    op.drop_table("support_ratings")
