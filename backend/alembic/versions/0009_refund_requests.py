import sqlalchemy as sa
from alembic import op


revision = "0009_refund_requests"
down_revision = "0008_payment_refunds"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "refund_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_admin_id", sa.Integer(), nullable=False),
        sa.Column("reviewed_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("internal_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"]),
        sa.ForeignKeyConstraint(["requested_by_admin_id"], ["admins.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_admin_id"], ["admins.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id", name="uq_refund_requests_order_id"),
    )
    op.create_index("ix_refund_requests_order_id", "refund_requests", ["order_id"])
    op.create_index("ix_refund_requests_requested_by_admin_id", "refund_requests", ["requested_by_admin_id"])
    op.create_index("ix_refund_requests_reviewed_by_admin_id", "refund_requests", ["reviewed_by_admin_id"])
    op.create_index("ix_refund_requests_status", "refund_requests", ["status"])
    op.create_index("ix_refund_requests_created_at", "refund_requests", ["created_at"])


def downgrade():
    op.drop_table("refund_requests")
