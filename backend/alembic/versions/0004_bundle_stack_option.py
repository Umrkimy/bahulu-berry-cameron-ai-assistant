import sqlalchemy as sa
from alembic import op


revision = "0004_bundle_stack_option"
down_revision = "0003_bundle_price_promotions"
branch_labels = None
depends_on = None


def upgrade():
    columns = {column["name"] for column in sa.inspect(op.get_bind()).get_columns("discounts")}
    if "stack_with_bundle" not in columns:
        with op.batch_alter_table("discounts") as batch_op:
            batch_op.add_column(
                sa.Column("stack_with_bundle", sa.Boolean(), nullable=False, server_default=sa.false())
            )


def downgrade():
    with op.batch_alter_table("discounts") as batch_op:
        batch_op.drop_column("stack_with_bundle")
