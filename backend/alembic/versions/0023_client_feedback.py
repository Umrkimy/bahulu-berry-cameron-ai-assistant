"""add private client feedback records

Revision ID: 0023_client_feedback
Revises: 0022_email_delivery
"""

from alembic import op
import sqlalchemy as sa


revision = "0023_client_feedback"
down_revision = "0022_email_delivery"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "client_feedback",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("reviewed_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("task_id", sa.Integer(), sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_client_feedback_category", "client_feedback", ["category"])
    op.create_index("ix_client_feedback_status", "client_feedback", ["status"])
    op.create_index("ix_client_feedback_created_by_admin_id", "client_feedback", ["created_by_admin_id"])
    op.create_index("ix_client_feedback_reviewed_by_admin_id", "client_feedback", ["reviewed_by_admin_id"])
    op.create_index("ix_client_feedback_task_id", "client_feedback", ["task_id"], unique=True)


def downgrade():
    op.drop_index("ix_client_feedback_task_id", table_name="client_feedback")
    op.drop_index("ix_client_feedback_reviewed_by_admin_id", table_name="client_feedback")
    op.drop_index("ix_client_feedback_created_by_admin_id", table_name="client_feedback")
    op.drop_index("ix_client_feedback_status", table_name="client_feedback")
    op.drop_index("ix_client_feedback_category", table_name="client_feedback")
    op.drop_table("client_feedback")
