import sqlalchemy as sa
from alembic import op


revision = "0002_product_promotions"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def _columns(table_name):
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade():
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "discounts" not in tables:
        op.create_table(
            "discounts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("discount_type", sa.String(length=20), nullable=False),
            sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
            sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_discounts_product_id", "discounts", ["product_id"])

    order_columns = _columns("orders")
    with op.batch_alter_table("orders") as batch_op:
        if "subtotal" not in order_columns:
            batch_op.add_column(sa.Column("subtotal", sa.Numeric(10, 2), nullable=False, server_default="0.00"))
        if "discount_amount" not in order_columns:
            batch_op.add_column(sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"))

    op.execute("UPDATE orders SET subtotal = total_amount WHERE subtotal = 0")

    item_columns = _columns("order_items")
    with op.batch_alter_table("order_items") as batch_op:
        if "discount_id" not in item_columns:
            batch_op.add_column(sa.Column("discount_id", sa.Integer(), nullable=True))
            batch_op.create_foreign_key("fk_order_items_discount_id", "discounts", ["discount_id"], ["id"], ondelete="SET NULL")
        if "discount_name" not in item_columns:
            batch_op.add_column(sa.Column("discount_name", sa.String(length=100), nullable=True))
        if "discount_type" not in item_columns:
            batch_op.add_column(sa.Column("discount_type", sa.String(length=20), nullable=True))
        if "discount_value" not in item_columns:
            batch_op.add_column(sa.Column("discount_value", sa.Numeric(10, 2), nullable=True))
        if "discount_amount" not in item_columns:
            batch_op.add_column(sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"))
        if "total_amount" not in item_columns:
            batch_op.add_column(sa.Column("total_amount", sa.Numeric(10, 2), nullable=False, server_default="0.00"))

    op.execute("UPDATE order_items SET total_amount = subtotal WHERE total_amount = 0")


def downgrade():
    with op.batch_alter_table("order_items") as batch_op:
        batch_op.drop_column("total_amount")
        batch_op.drop_column("discount_amount")
        batch_op.drop_column("discount_value")
        batch_op.drop_column("discount_type")
        batch_op.drop_column("discount_name")
        batch_op.drop_constraint("fk_order_items_discount_id", type_="foreignkey")
        batch_op.drop_column("discount_id")

    with op.batch_alter_table("orders") as batch_op:
        batch_op.drop_column("discount_amount")
        batch_op.drop_column("subtotal")

    op.drop_index("ix_discounts_product_id", table_name="discounts")
    op.drop_table("discounts")
