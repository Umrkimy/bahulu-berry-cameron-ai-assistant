"""Keep Meta's reason when a WhatsApp reply is not delivered."""

from alembic import op
import sqlalchemy as sa

revision = "0039_message_delivery_error"
down_revision = "0038_whatsapp_menu_state"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("messaging_events", sa.Column("delivery_error", sa.String(160), nullable=True))


def downgrade():
    op.drop_column("messaging_events", "delivery_error")
