"""Cancel deliveries that belong to cancelled orders.

Cancelling an order now also cancels its delivery. This brings existing
deliveries of already-cancelled orders in line.
"""

from alembic import op

revision = "0037_cancel_order_deliveries"
down_revision = "0036_customer_accounts"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "UPDATE deliveries SET status = 'CANCELLED' "
        "WHERE status <> 'DELIVERED' "
        "AND order_id IN (SELECT id FROM orders WHERE status = 'CANCELLED')"
    )


def downgrade():
    op.execute("UPDATE deliveries SET status = 'PENDING' WHERE status = 'CANCELLED'")
