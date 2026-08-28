import sqlalchemy as sa
from alembic import op


revision = "0005_ai_action_confirmations"
down_revision = "0004_bundle_stack_option"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ai_action_confirmations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=20), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "admin_id",
            "conversation_id",
            name="uq_ai_action_confirmation_admin_conversation",
        ),
    )
    op.create_index(
        "ix_ai_action_confirmations_admin_id",
        "ai_action_confirmations",
        ["admin_id"],
    )


def downgrade():
    op.drop_index("ix_ai_action_confirmations_admin_id", table_name="ai_action_confirmations")
    op.drop_table("ai_action_confirmations")
