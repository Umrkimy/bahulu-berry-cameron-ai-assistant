import sqlalchemy as sa
from alembic import op


revision = "0007_admin_roles"
down_revision = "0006_activity_logs"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("admins", sa.Column("role", sa.String(length=20), nullable=True))
    op.add_column("admins", sa.Column("is_active", sa.Boolean(), nullable=True))
    op.execute("UPDATE admins SET role = CASE WHEN is_superuser THEN 'OWNER' ELSE 'STAFF' END")
    op.execute("UPDATE admins SET is_active = 1 WHERE is_active IS NULL")
    with op.batch_alter_table("admins") as batch:
        batch.alter_column("role", nullable=False)
        batch.alter_column("is_active", nullable=False)
    op.create_index("ix_admins_role", "admins", ["role"])
    op.create_index("ix_admins_is_active", "admins", ["is_active"])


def downgrade():
    op.drop_index("ix_admins_is_active", table_name="admins")
    op.drop_index("ix_admins_role", table_name="admins")
    op.drop_column("admins", "is_active")
    op.drop_column("admins", "role")
