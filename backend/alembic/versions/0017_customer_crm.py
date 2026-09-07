import sqlalchemy as sa
from alembic import op

revision = "0017_customer_crm"
down_revision = "0016_inventory_ledger"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("customers", sa.Column("tags", sa.String(500), nullable=True))
    op.add_column("customers", sa.Column("internal_note", sa.Text(), nullable=True))
    op.add_column("customers", sa.Column("follow_up_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_customers_follow_up_at", "customers", ["follow_up_at"])

def downgrade():
    op.drop_index("ix_customers_follow_up_at", table_name="customers")
    op.drop_column("customers", "follow_up_at")
    op.drop_column("customers", "internal_note")
    op.drop_column("customers", "tags")
