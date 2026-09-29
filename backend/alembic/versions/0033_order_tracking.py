"""Private tracking links for website orders.

Only a SHA-256 hash of each tracking token is stored. ``closed_at`` records
when an order was completed or cancelled, so tracking links can expire.
"""

from alembic import op
import sqlalchemy as sa

revision = "0033_order_tracking"
down_revision = "0032_support_drafts"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("orders", sa.Column("tracking_token_hash", sa.String(64), nullable=True))
    op.add_column("orders", sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_orders_tracking_token_hash", "orders", ["tracking_token_hash"], unique=True)
    op.execute("UPDATE orders SET closed_at = updated_at WHERE status IN ('COMPLETED', 'CANCELLED')")


def downgrade():
    op.drop_index("ix_orders_tracking_token_hash", table_name="orders")
    op.drop_column("orders", "closed_at")
    op.drop_column("orders", "tracking_token_hash")
