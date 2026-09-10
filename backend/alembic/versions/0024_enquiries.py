"""convert private client feedback to owner enquiries

Revision ID: 0024_enquiries
Revises: 0023_client_feedback
"""

from alembic import op
import sqlalchemy as sa


revision = "0024_enquiries"
down_revision = "0023_client_feedback"
branch_labels = None
depends_on = None


def upgrade():
    op.rename_table("client_feedback", "enquiries")
    op.drop_index("ix_client_feedback_category", table_name="enquiries")
    op.drop_index("ix_client_feedback_status", table_name="enquiries")
    op.drop_index("ix_client_feedback_created_by_admin_id", table_name="enquiries")
    op.drop_index("ix_client_feedback_reviewed_by_admin_id", table_name="enquiries")
    op.drop_index("ix_client_feedback_task_id", table_name="enquiries")
    with op.batch_alter_table("enquiries") as batch:
        batch.alter_column("category", new_column_name="source", existing_type=sa.String(length=20))
        batch.alter_column("reviewed_by_admin_id", new_column_name="status_updated_by_admin_id", existing_type=sa.Integer())
        batch.alter_column("reviewed_at", new_column_name="status_updated_at", existing_type=sa.DateTime(timezone=True))
        batch.add_column(sa.Column("contact_name", sa.String(length=120), nullable=True))
        batch.add_column(sa.Column("reply_contact", sa.String(length=255), nullable=True))
    op.create_index("ix_enquiries_source", "enquiries", ["source"])
    op.create_index("ix_enquiries_status", "enquiries", ["status"])
    op.create_index("ix_enquiries_created_by_admin_id", "enquiries", ["created_by_admin_id"])
    op.create_index("ix_enquiries_status_updated_by_admin_id", "enquiries", ["status_updated_by_admin_id"])
    op.create_index("ix_enquiries_task_id", "enquiries", ["task_id"], unique=True)
    op.execute("UPDATE enquiries SET source = 'OTHER'")
    op.execute("UPDATE enquiries SET status = CASE status WHEN 'APPROVED' THEN 'WORKING' WHEN 'DEFERRED' THEN 'NEW' WHEN 'DECLINED' THEN 'SPAM' ELSE status END")
    op.execute("UPDATE activity_logs SET entity_type = 'enquiry', description = replace(replace(description, 'client feedback', 'enquiry'), 'Client feedback', 'Enquiry') WHERE entity_type = 'client_feedback'")


def downgrade():
    op.drop_index("ix_enquiries_task_id", table_name="enquiries")
    op.drop_index("ix_enquiries_status_updated_by_admin_id", table_name="enquiries")
    op.drop_index("ix_enquiries_created_by_admin_id", table_name="enquiries")
    op.drop_index("ix_enquiries_status", table_name="enquiries")
    op.drop_index("ix_enquiries_source", table_name="enquiries")
    with op.batch_alter_table("enquiries") as batch:
        batch.drop_column("reply_contact")
        batch.drop_column("contact_name")
        batch.alter_column("status_updated_at", new_column_name="reviewed_at", existing_type=sa.DateTime(timezone=True))
        batch.alter_column("status_updated_by_admin_id", new_column_name="reviewed_by_admin_id", existing_type=sa.Integer())
        batch.alter_column("source", new_column_name="category", existing_type=sa.String(length=20))
    op.rename_table("enquiries", "client_feedback")
    op.create_index("ix_client_feedback_category", "client_feedback", ["category"])
    op.create_index("ix_client_feedback_status", "client_feedback", ["status"])
    op.create_index("ix_client_feedback_created_by_admin_id", "client_feedback", ["created_by_admin_id"])
    op.create_index("ix_client_feedback_reviewed_by_admin_id", "client_feedback", ["reviewed_by_admin_id"])
    op.create_index("ix_client_feedback_task_id", "client_feedback", ["task_id"], unique=True)
