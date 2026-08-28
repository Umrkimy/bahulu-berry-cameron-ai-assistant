import sqlalchemy as sa
from alembic import op


revision = "0010_ai_confirmation_previews"
down_revision = "0009_refund_requests"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("ai_action_confirmations", sa.Column("tool_name", sa.String(length=60), nullable=True))
    op.add_column("ai_action_confirmations", sa.Column("arguments", sa.JSON(), nullable=True))
    op.add_column("ai_action_confirmations", sa.Column("description", sa.String(length=500), nullable=True))


def downgrade():
    op.drop_column("ai_action_confirmations", "description")
    op.drop_column("ai_action_confirmations", "arguments")
    op.drop_column("ai_action_confirmations", "tool_name")
