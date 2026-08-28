import sqlalchemy as sa
from alembic import op
revision="0011_support_workspace"
down_revision="0010_ai_confirmation_previews"
branch_labels=None
depends_on=None
def upgrade():
    op.create_table("support_faqs",sa.Column("id",sa.Integer,primary_key=True),sa.Column("category",sa.String(80),nullable=False),sa.Column("question_en",sa.Text,nullable=False),sa.Column("answer_en",sa.Text,nullable=False),sa.Column("question_ms",sa.Text),sa.Column("answer_ms",sa.Text),sa.Column("is_active",sa.Boolean,nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("support_templates",sa.Column("id",sa.Integer,primary_key=True),sa.Column("category",sa.String(80),nullable=False),sa.Column("name",sa.String(120),nullable=False),sa.Column("content_en",sa.Text,nullable=False),sa.Column("content_ms",sa.Text),sa.Column("is_active",sa.Boolean,nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("handoff_rules",sa.Column("id",sa.Integer,primary_key=True),sa.Column("trigger",sa.String(120),nullable=False,unique=True),sa.Column("description",sa.Text,nullable=False),sa.Column("is_active",sa.Boolean,nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("support_requests",sa.Column("id",sa.Integer,primary_key=True),sa.Column("customer_id",sa.Integer,sa.ForeignKey("customers.id")),sa.Column("customer_name",sa.String(160),nullable=False),sa.Column("contact",sa.String(160)),sa.Column("source",sa.String(40),nullable=False),sa.Column("subject",sa.String(200),nullable=False),sa.Column("notes",sa.Text),sa.Column("handoff_reason",sa.String(120)),sa.Column("priority",sa.String(20),nullable=False),sa.Column("status",sa.String(30),nullable=False),sa.Column("assigned_admin_id",sa.Integer,sa.ForeignKey("admins.id")),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.Column("updated_at",sa.DateTime(timezone=True),nullable=False))
def downgrade():
    op.drop_table("support_requests");op.drop_table("handoff_rules");op.drop_table("support_templates");op.drop_table("support_faqs")
