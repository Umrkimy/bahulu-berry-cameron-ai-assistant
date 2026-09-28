"""Add reusable media assets behind product gallery placements."""

from alembic import op
import sqlalchemy as sa

revision = "0030_media_library"
down_revision = "0029_storefront_homepage"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("storage_key", sa.String(200), nullable=False, unique=True),
        sa.Column("title", sa.String(120), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("mime_type", sa.String(50), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("byte_size", sa.Integer(), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True, unique=True),
        sa.Column("legacy", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_media_assets_is_archived", "media_assets", ["is_archived"])
    op.add_column("product_images", sa.Column("media_asset_id", sa.Integer(), nullable=True))

    connection = op.get_bind()
    rows = connection.execute(sa.text(
        "SELECT pi.id, pi.filename, pi.legacy, pi.position, p.name "
        "FROM product_images pi JOIN products p ON p.id = pi.product_id ORDER BY pi.id"
    )).mappings()
    for row in rows:
        title = f"{row['name']} - photo {int(row['position']) + 1}"[:120]
        connection.execute(sa.text(
            "INSERT INTO media_assets (id, storage_key, title, legacy, is_archived, created_at, updated_at) "
            "VALUES (:id, :storage_key, :title, :legacy, :archived, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ), {"id": row["id"], "storage_key": row["filename"], "title": title, "legacy": row["legacy"], "archived": False})
        connection.execute(sa.text("UPDATE product_images SET media_asset_id = :id WHERE id = :id"), {"id": row["id"]})

    if connection.dialect.name == "postgresql":
        connection.execute(sa.text(
            "SELECT setval(pg_get_serial_sequence('media_assets', 'id'), "
            "COALESCE((SELECT MAX(id) FROM media_assets), 1), "
            "EXISTS(SELECT 1 FROM media_assets))"
        ))

    with op.batch_alter_table("product_images") as batch:
        batch.alter_column("media_asset_id", nullable=False)
        batch.create_foreign_key("fk_product_images_media_asset", "media_assets", ["media_asset_id"], ["id"], ondelete="RESTRICT")
        batch.create_unique_constraint("uq_product_image_asset", ["product_id", "media_asset_id"])
        batch.drop_column("filename")
        batch.drop_column("legacy")
    op.create_index("ix_product_images_media_asset_id", "product_images", ["media_asset_id"])


def downgrade():
    with op.batch_alter_table("product_images") as batch:
        batch.add_column(sa.Column("legacy", sa.Boolean(), nullable=True))
        batch.add_column(sa.Column("filename", sa.String(200), nullable=True))
    connection = op.get_bind()
    connection.execute(sa.text(
        "UPDATE product_images SET filename = (SELECT storage_key FROM media_assets WHERE media_assets.id = product_images.media_asset_id), "
        "legacy = (SELECT legacy FROM media_assets WHERE media_assets.id = product_images.media_asset_id)"
    ))
    op.drop_index("ix_product_images_media_asset_id", table_name="product_images")
    with op.batch_alter_table("product_images") as batch:
        batch.alter_column("filename", nullable=False)
        batch.alter_column("legacy", nullable=False)
        batch.drop_constraint("uq_product_image_asset", type_="unique")
        batch.drop_constraint("fk_product_images_media_asset", type_="foreignkey")
        batch.drop_column("media_asset_id")
    op.drop_index("ix_media_assets_is_archived", table_name="media_assets")
    op.drop_table("media_assets")
