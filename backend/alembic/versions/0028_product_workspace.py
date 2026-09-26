"""Unify English product content and enforce storefront readiness."""

from alembic import op
import sqlalchemy as sa


revision = "0028_product_workspace"
down_revision = "0027_product_gallery"
branch_labels = None
depends_on = None


def upgrade():
    products = sa.table(
        "products",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("is_active", sa.Boolean()),
        sa.column("storefront_published", sa.Boolean()),
        sa.column("storefront_name_en", sa.String()),
        sa.column("storefront_name_ms", sa.String()),
        sa.column("storefront_description_en", sa.Text()),
    )
    images = sa.table(
        "product_images",
        sa.column("product_id", sa.Integer()),
    )
    feature = sa.table(
        "storefront_feature",
        sa.column("id", sa.Integer()),
        sa.column("product_id", sa.Integer()),
    )

    connection = op.get_bind()
    connection.execute(
        sa.update(products)
        .where(
            sa.or_(
                products.c.is_active.is_(False),
                products.c.storefront_name_en.is_(None),
                sa.func.length(sa.func.trim(products.c.storefront_name_en)) == 0,
                products.c.storefront_name_ms.is_(None),
                sa.func.length(sa.func.trim(products.c.storefront_name_ms)) == 0,
                ~sa.exists(sa.select(1).where(images.c.product_id == products.c.id)),
            )
        )
        .values(storefront_published=False)
    )
    connection.execute(
        sa.update(products).values(
            name=sa.case(
                (
                    sa.func.length(sa.func.trim(products.c.storefront_name_en)) > 0,
                    products.c.storefront_name_en,
                ),
                else_=products.c.name,
            ),
            description=sa.case(
                (
                    products.c.storefront_published.is_(True),
                    products.c.storefront_description_en,
                ),
                (
                    products.c.storefront_description_en.is_not(None),
                    products.c.storefront_description_en,
                ),
                else_=products.c.description,
            ),
        )
    )
    eligible_ids = sa.select(products.c.id).where(
        products.c.is_active.is_(True),
        products.c.storefront_published.is_(True),
    )
    connection.execute(
        sa.update(feature)
        .where(feature.c.product_id.is_not(None), feature.c.product_id.not_in(eligible_ids))
        .values(product_id=None)
    )

    with op.batch_alter_table("products") as batch:
        batch.drop_column("storefront_name_en")
        batch.drop_column("storefront_description_en")
        batch.alter_column(
            "storefront_name_ms",
            new_column_name="name_ms",
            existing_type=sa.String(100),
            existing_nullable=True,
        )
        batch.alter_column(
            "storefront_description_ms",
            new_column_name="description_ms",
            existing_type=sa.Text(),
            existing_nullable=True,
        )


def downgrade():
    with op.batch_alter_table("products") as batch:
        batch.alter_column(
            "name_ms",
            new_column_name="storefront_name_ms",
            existing_type=sa.String(100),
            existing_nullable=True,
        )
        batch.alter_column(
            "description_ms",
            new_column_name="storefront_description_ms",
            existing_type=sa.Text(),
            existing_nullable=True,
        )
        batch.add_column(sa.Column("storefront_name_en", sa.String(100), nullable=True))
        batch.add_column(sa.Column("storefront_description_en", sa.Text(), nullable=True))

    products = sa.table(
        "products",
        sa.column("name", sa.String()),
        sa.column("description", sa.Text()),
        sa.column("storefront_name_en", sa.String()),
        sa.column("storefront_description_en", sa.Text()),
    )
    op.get_bind().execute(
        sa.update(products).values(
            storefront_name_en=products.c.name,
            storefront_description_en=products.c.description,
        )
    )
