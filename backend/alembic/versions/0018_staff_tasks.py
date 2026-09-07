import sqlalchemy as sa
from alembic import op
revision="0018_staff_tasks"; down_revision="0017_customer_crm"; branch_labels=None; depends_on=None
def upgrade():
    op.create_table("tasks", sa.Column("id",sa.Integer,primary_key=True),sa.Column("title",sa.String(200),nullable=False),sa.Column("description",sa.Text),sa.Column("status",sa.String(30),nullable=False),sa.Column("priority",sa.String(20),nullable=False),sa.Column("due_at",sa.DateTime(timezone=True)),sa.Column("assigned_admin_id",sa.Integer,sa.ForeignKey("admins.id")),sa.Column("created_by_admin_id",sa.Integer,sa.ForeignKey("admins.id"),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False))
    op.create_index("ix_tasks_status","tasks",["status"]);op.create_index("ix_tasks_due_at","tasks",["due_at"]);op.create_index("ix_tasks_assigned_admin_id","tasks",["assigned_admin_id"])
def downgrade(): op.drop_table("tasks")
