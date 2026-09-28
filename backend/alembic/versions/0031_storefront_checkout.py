"""Website checkout: order source, idempotent checkout requests, webhook events."""

from alembic import op
import sqlalchemy as sa

revision = "0031_storefront_checkout"
down_revision = "0030_media_library"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "orders",
        sa.Column("source", sa.String(20), nullable=False, server_default="ADMIN"),
    )
    op.create_index("ix_orders_source", "orders", ["source"])

    op.create_table(
        "checkout_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("idempotency_key", sa.String(64), nullable=False, unique=True),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("payment_id", sa.Integer(), sa.ForeignKey("payments.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_checkout_requests_order_id", "checkout_requests", ["order_id"])

    op.create_table(
        "payment_webhook_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("provider", sa.String(50), nullable=False),
        sa.Column("event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("provider", "event_id", name="uq_payment_webhook_events_provider_event"),
    )

    # One provider session maps to exactly one local payment.
    op.drop_index("ix_payments_provider_payment_id", table_name="payments")
    op.create_index("ix_payments_provider_payment_id", "payments", ["provider_payment_id"], unique=True)


def downgrade():
    op.drop_index("ix_payments_provider_payment_id", table_name="payments")
    op.create_index("ix_payments_provider_payment_id", "payments", ["provider_payment_id"], unique=False)
    op.drop_table("payment_webhook_events")
    op.drop_index("ix_checkout_requests_order_id", table_name="checkout_requests")
    op.drop_table("checkout_requests")
    op.drop_index("ix_orders_source", table_name="orders")
    op.drop_column("orders", "source")
