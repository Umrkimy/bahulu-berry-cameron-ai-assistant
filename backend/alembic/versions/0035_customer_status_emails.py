"""Customer status emails for website orders.

- ``order_tracking_tokens`` holds one hash per tracking link, so each status
  email can carry a fresh link without breaking earlier ones. Existing order
  hashes move into it and ``orders.tracking_token_hash`` is dropped.
- ``orders.contact_email`` and ``orders.locale`` keep the checkout email and
  storefront language for that order.
- ``email_deliveries`` also queues customer emails: ``recipient_admin_id``
  becomes optional, ``order_id`` links the order, ``attempts`` counts retries.
"""

from alembic import op
import sqlalchemy as sa

revision = "0035_customer_status_emails"
down_revision = "0034_drop_storefront_feature"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "order_tracking_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_order_tracking_tokens_order_id", "order_tracking_tokens", ["order_id"])
    op.execute(
        "INSERT INTO order_tracking_tokens (order_id, token_hash, created_at) "
        "SELECT id, tracking_token_hash, updated_at FROM orders WHERE tracking_token_hash IS NOT NULL"
    )

    with op.batch_alter_table("orders") as batch:
        batch.drop_index("ix_orders_tracking_token_hash")
        batch.drop_column("tracking_token_hash")
        batch.add_column(sa.Column("contact_email", sa.String(255), nullable=True))
        batch.add_column(sa.Column("locale", sa.String(2), nullable=True))

    with op.batch_alter_table("email_deliveries") as batch:
        batch.alter_column("recipient_admin_id", existing_type=sa.Integer(), nullable=True)
        batch.add_column(sa.Column("order_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"))
        batch.create_foreign_key("fk_email_deliveries_order_id_orders", "orders", ["order_id"], ["id"], ondelete="CASCADE")
        batch.create_index("ix_email_deliveries_order_id", ["order_id"])


def downgrade():
    # Customer emails have no admin recipient, so they cannot survive the
    # NOT NULL column coming back.
    op.execute("DELETE FROM email_deliveries WHERE recipient_admin_id IS NULL")
    with op.batch_alter_table("email_deliveries") as batch:
        batch.drop_index("ix_email_deliveries_order_id")
        batch.drop_constraint("fk_email_deliveries_order_id_orders", type_="foreignkey")
        batch.drop_column("attempts")
        batch.drop_column("order_id")
        batch.alter_column("recipient_admin_id", existing_type=sa.Integer(), nullable=False)

    with op.batch_alter_table("orders") as batch:
        batch.drop_column("locale")
        batch.drop_column("contact_email")
        batch.add_column(sa.Column("tracking_token_hash", sa.String(64), nullable=True))
        batch.create_index("ix_orders_tracking_token_hash", ["tracking_token_hash"], unique=True)

    # One column holds one link: keep each order's newest.
    op.execute(
        "UPDATE orders SET tracking_token_hash = ("
        "SELECT token_hash FROM order_tracking_tokens t WHERE t.order_id = orders.id ORDER BY t.id DESC LIMIT 1)"
    )
    op.drop_index("ix_order_tracking_tokens_order_id", table_name="order_tracking_tokens")
    op.drop_table("order_tracking_tokens")
