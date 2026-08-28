import sqlalchemy as sa
from alembic import op


revision = "0008_payment_refunds"
down_revision = "0007_admin_roles"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("payments", sa.Column("provider_refund_id", sa.String(length=255), nullable=True))
    op.add_column("payments", sa.Column("refund_reason", sa.Text(), nullable=True))
    op.add_column("payments", sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_payments_provider_refund_id", "payments", ["provider_refund_id"])


def downgrade():
    op.drop_index("ix_payments_provider_refund_id", table_name="payments")
    op.drop_column("payments", "refunded_at")
    op.drop_column("payments", "refund_reason")
    op.drop_column("payments", "provider_refund_id")
