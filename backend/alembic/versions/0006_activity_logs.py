import sqlalchemy as sa
from alembic import op


revision = "0006_activity_logs"
down_revision = "0005_ai_action_confirmations"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("action", sa.String(length=50), nullable=False),
        sa.Column("entity_type", sa.String(length=50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("admin_id", "action", "entity_type", "entity_id", "created_at"):
        op.create_index(f"ix_activity_logs_{column}", "activity_logs", [column])


def downgrade():
    for column in ("created_at", "entity_id", "entity_type", "action", "admin_id"):
        op.drop_index(f"ix_activity_logs_{column}", table_name="activity_logs")
    op.drop_table("activity_logs")
