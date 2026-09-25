"""Persistent product galleries and one homepage selection."""
from alembic import op
import sqlalchemy as sa

revision = "0027_product_gallery"
down_revision = "0026_customer_retention_contacts"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("product_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("legacy", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_product_images_product_id", "product_images", ["product_id"])
    op.execute(sa.text("INSERT INTO product_images (product_id, filename, position, legacy) SELECT id, image_file, 0, true FROM products WHERE image_file IS NOT NULL AND image_file <> ''"))
    op.create_table("storefront_feature",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("product_id", sa.Integer(), sa.ForeignKey("products.id", ondelete="SET NULL"), nullable=True),
        sa.CheckConstraint("id = 1", name="single_storefront_feature"))
    op.execute(sa.text("INSERT INTO storefront_feature (id, product_id) VALUES (1, NULL)"))


def downgrade():
    # Uploaded media is retained on disk; restore the matching DB backup to recover galleries.
    op.drop_table("storefront_feature")
    op.drop_index("ix_product_images_product_id", table_name="product_images")
    op.drop_table("product_images")
