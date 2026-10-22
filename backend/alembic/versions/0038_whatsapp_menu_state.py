"""Remember each WhatsApp conversation's menu language and step."""

from alembic import op
import sqlalchemy as sa

revision = "0038_whatsapp_menu_state"
down_revision = "0037_cancel_order_deliveries"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("messaging_conversations", sa.Column("menu_language", sa.String(2), nullable=True))
    op.add_column("messaging_conversations", sa.Column("menu_step", sa.String(30), nullable=True))


def downgrade():
    op.drop_column("messaging_conversations", "menu_step")
    op.drop_column("messaging_conversations", "menu_language")
