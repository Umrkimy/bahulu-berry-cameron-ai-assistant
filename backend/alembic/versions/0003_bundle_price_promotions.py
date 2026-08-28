import sqlalchemy as sa
from alembic import op


revision = "0003_bundle_price_promotions"
down_revision = "0002_product_promotions"
branch_labels = None
depends_on = None


def _columns(table_name):
    return {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table_name)}


def upgrade():
    discount_columns = _columns("discounts")
    order_item_columns = _columns("order_items")

    with op.batch_alter_table("discounts") as batch_op:
        if "bundle_quantity" not in discount_columns:
            batch_op.add_column(sa.Column("bundle_quantity", sa.Integer(), nullable=True))

    with op.batch_alter_table("order_items") as batch_op:
        if "discount_bundle_quantity" not in order_item_columns:
            batch_op.add_column(sa.Column("discount_bundle_quantity", sa.Integer(), nullable=True))


def downgrade():
    with op.batch_alter_table("order_items") as batch_op:
        batch_op.drop_column("discount_bundle_quantity")

    with op.batch_alter_table("discounts") as batch_op:
        batch_op.drop_column("bundle_quantity")
