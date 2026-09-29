"""Drop the homepage featured-product selection.

The homepage hero is now fixed brand artwork, so products are no longer
featured from the dashboard.
"""

from alembic import op
import sqlalchemy as sa

revision = "0034_drop_storefront_feature"
down_revision = "0033_order_tracking"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("storefront_feature")


def downgrade():
    # Restores the empty selection; the previously featured product is not kept.
    op.create_table("storefront_feature",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.CheckConstraint("id = 1", name="single_storefront_feature"))
    op.execute(sa.text("INSERT INTO storefront_feature (id, product_id) VALUES (1, NULL)"))
