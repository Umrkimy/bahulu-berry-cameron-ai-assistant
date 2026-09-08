import sqlalchemy as sa
from alembic import op


revision = "0021_storefront_products"
down_revision = "0020_notifications"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("storefront_published", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("products", sa.Column("storefront_name_en", sa.String(length=100), nullable=True))
    op.add_column("products", sa.Column("storefront_name_ms", sa.String(length=100), nullable=True))
    op.add_column("products", sa.Column("storefront_description_en", sa.Text(), nullable=True))
    op.add_column("products", sa.Column("storefront_description_ms", sa.Text(), nullable=True))
    op.create_index("ix_products_storefront_published", "products", ["storefront_published"])


def downgrade():
    op.drop_index("ix_products_storefront_published", table_name="products")
    op.drop_column("products", "storefront_description_ms")
    op.drop_column("products", "storefront_description_en")
    op.drop_column("products", "storefront_name_ms")
    op.drop_column("products", "storefront_name_en")
    op.drop_column("products", "storefront_published")
