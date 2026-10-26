"""Owner-edited wording for Berry's WhatsApp menu."""

from alembic import op
import sqlalchemy as sa

revision = "0041_whatsapp_menu_copy"
down_revision = "0040_support_ratings"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "whatsapp_menu_copy",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("overrides", sa.JSON(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("updated_by_admin_id", sa.Integer(), sa.ForeignKey("admins.id", ondelete="SET NULL"), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("id = 1", name="single_whatsapp_menu_copy"),
    )


def downgrade():
    op.drop_table("whatsapp_menu_copy")
