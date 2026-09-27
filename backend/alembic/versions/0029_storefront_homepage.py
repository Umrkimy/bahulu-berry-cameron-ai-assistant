"""Add versioned storefront homepage content."""

from copy import deepcopy

from alembic import op
import sqlalchemy as sa

revision = "0029_storefront_homepage"
down_revision = "0028_product_workspace"
branch_labels = None
depends_on = None

# Keep seed data migration-local so future application changes cannot alter
# the historical result of this migration.
DEFAULT_HOMEPAGE_CONTENT = {
    "hero": {
        "eyebrow": {"en": "HELLO FROM BAHULU BERRY CAMERON", "ms": "SALAM DARI BAHULU BERRY CAMERON"},
        "title_primary": {"en": "Bahulu.", "ms": "Bahulu."},
        "title_accent": {"en": "Berry.", "ms": "Berry."},
        "title_suffix": {"en": "Cameron.", "ms": "Cameron."},
        "body": {"en": "Meet Bahulu Berry Cameron. Take a closer look at our collection.", "ms": "Kenali Bahulu Berry Cameron dan terokai koleksi kami."},
        "cta_label": {"en": "Browse products", "ms": "Lihat produk"},
    },
    "benefits": {
        "enabled": False,
        "eyebrow": {"en": "", "ms": ""},
        "title": {"en": "", "ms": ""},
        "items": [
            {"title": {"en": "", "ms": ""}, "body": {"en": "", "ms": ""}},
            {"title": {"en": "", "ms": ""}, "body": {"en": "", "ms": ""}},
            {"title": {"en": "", "ms": ""}, "body": {"en": "", "ms": ""}},
        ],
    },
    "collection": {
        "eyebrow": {"en": "TAKE A CLOSER LOOK", "ms": "LIHAT DENGAN LEBIH DEKAT"},
        "title": {"en": "Meet the collection", "ms": "Kenali koleksi kami"},
        "view_all_label": {"en": "View all products", "ms": "Lihat semua produk"},
    },
    "story": {
        "eyebrow": {"en": "A FACE TO REMEMBER", "ms": "WAJAH UNTUK DIKENALI"},
        "title": {"en": "Say hello to Bahulu Berry Cameron.", "ms": "Salam daripada Bahulu Berry Cameron."},
        "body": {"en": "Bahulu, a berry-inspired identity, and a character of our own. Get to know the name behind the collection.", "ms": "Bahulu, identiti berinspirasikan beri, dan karakter tersendiri. Kenali nama di sebalik koleksi kami."},
        "cta_label": {"en": "Meet Bahulu Berry Cameron", "ms": "Kenali Bahulu Berry Cameron"},
    },
    "reviews": {"enabled": False, "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""}},
    "location": {
        "enabled": False,
        "eyebrow": {"en": "", "ms": ""},
        "title": {"en": "", "ms": ""},
        "load_map_label": {"en": "", "ms": ""},
        "directions_label": {"en": "", "ms": ""},
    },
    "closing": {
        "eyebrow": {"en": "EXPLORE THE COLLECTION", "ms": "TEROKAI KOLEKSI"},
        "title": {"en": "Find your next favourite.", "ms": "Temui pilihan kegemaran anda."},
        "body": {"en": "Browse the products currently available from Bahulu Berry Cameron.", "ms": "Lihat produk Bahulu Berry Cameron yang tersedia pada masa ini."},
        "cta_label": {"en": "Browse products", "ms": "Lihat produk"},
    },
    "google_place_id": None,
}


def upgrade():
    op.create_table(
        "storefront_homepage",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("draft_content", sa.JSON(), nullable=False),
        sa.Column("published_content", sa.JSON(), nullable=False),
        sa.Column("draft_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("published_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("published_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("id = 1", name="single_storefront_homepage"),
    )
    table = sa.table(
        "storefront_homepage",
        sa.column("id", sa.Integer()), sa.column("draft_content", sa.JSON()), sa.column("published_content", sa.JSON()),
        sa.column("draft_version", sa.Integer()), sa.column("published_version", sa.Integer()),
    )
    op.bulk_insert(table, [{"id": 1, "draft_content": deepcopy(DEFAULT_HOMEPAGE_CONTENT), "published_content": deepcopy(DEFAULT_HOMEPAGE_CONTENT), "draft_version": 1, "published_version": 1}])


def downgrade():
    op.drop_table("storefront_homepage")
