"""add semantic support knowledge

Revision ID: 0025_semantic_support_knowledge
Revises: 0024_enquiries
"""

from alembic import op
import sqlalchemy as sa


revision = "0025_semantic_support_knowledge"
down_revision = "0024_enquiries"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "knowledge_articles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("title_en", sa.String(length=200), nullable=False),
        sa.Column("content_en", sa.Text(), nullable=False),
        sa.Column("title_ms", sa.String(length=200), nullable=True),
        sa.Column("content_ms", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "support_knowledge_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("source_type", sa.String(length=30), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=False),
        sa.Column("language", sa.String(length=2), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("source_type", "source_id", "language", "chunk_index", name="uq_support_knowledge_chunk_source"),
    )
    # Alter after table creation so Alembic remains database-agnostic while
    # PostgreSQL receives its native pgvector storage and ANN index.
    op.execute("ALTER TABLE support_knowledge_chunks ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector")
    op.create_index("ix_support_knowledge_chunks_source_type", "support_knowledge_chunks", ["source_type"])
    op.create_index("ix_support_knowledge_chunks_source_id", "support_knowledge_chunks", ["source_id"])
    op.create_index("ix_support_knowledge_chunks_language", "support_knowledge_chunks", ["language"])
    op.execute("CREATE INDEX ix_support_knowledge_chunks_embedding_hnsw ON support_knowledge_chunks USING hnsw (embedding vector_cosine_ops)")


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_support_knowledge_chunks_embedding_hnsw")
    op.drop_table("support_knowledge_chunks")
    op.drop_table("knowledge_articles")
