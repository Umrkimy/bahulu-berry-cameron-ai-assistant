import sqlalchemy as sa
from alembic import op


revision = "0020_notifications"
down_revision = "0019_contextual_tasks"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("admin_id", sa.Integer(), sa.ForeignKey("admins.id"), nullable=False),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("route", sa.String(200), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    for name, columns in (
        ("ix_notifications_admin_id", ["admin_id"]),
        ("ix_notifications_notification_type", ["notification_type"]),
        ("ix_notifications_entity_type", ["entity_type"]),
        ("ix_notifications_entity_id", ["entity_id"]),
        ("ix_notifications_read_at", ["read_at"]),
        ("ix_notifications_created_at", ["created_at"]),
    ):
        op.create_index(name, "notifications", columns)


def downgrade():
    op.drop_table("notifications")
