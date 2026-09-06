import sqlalchemy as sa
from alembic import op


revision = "0012_ai_usage_ledger"
down_revision = "0011_support_workspace"
branch_labels = None
depends_on = None


def upgrade():
    if "ai_usage" in sa.inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "ai_usage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("source", sa.String(length=40), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("estimated_cost_usd", sa.Numeric(12, 6), nullable=False),
        sa.Column("outcome", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_ai_usage_admin_id", "ai_usage", ["admin_id"])
    op.create_index("ix_ai_usage_outcome", "ai_usage", ["outcome"])
    op.create_index("ix_ai_usage_created_at", "ai_usage", ["created_at"])


def downgrade():
    op.drop_index("ix_ai_usage_created_at", table_name="ai_usage")
    op.drop_index("ix_ai_usage_outcome", table_name="ai_usage")
    op.drop_index("ix_ai_usage_admin_id", table_name="ai_usage")
    op.drop_table("ai_usage")
