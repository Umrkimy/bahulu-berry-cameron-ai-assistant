import sqlalchemy as sa
from alembic import op

revision = "0019_contextual_tasks"
down_revision = "0018_staff_tasks"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("tasks", sa.Column("context_type", sa.String(20), nullable=True))
    op.add_column("tasks", sa.Column("context_id", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("context_label", sa.String(200), nullable=True))
    op.add_column("tasks", sa.Column("completion_note", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_tasks_context_type", "tasks", ["context_type"])
    op.create_index("ix_tasks_context_id", "tasks", ["context_id"])


def downgrade():
    op.drop_index("ix_tasks_context_id", table_name="tasks")
    op.drop_index("ix_tasks_context_type", table_name="tasks")
    op.drop_column("tasks", "completed_at")
    op.drop_column("tasks", "completion_note")
    op.drop_column("tasks", "context_label")
    op.drop_column("tasks", "context_id")
    op.drop_column("tasks", "context_type")
