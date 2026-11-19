"""add payment source fields

Revision ID: 9f1a2b3c4d5e
Revises: fecc6ee139bd
Create Date: 2026-11-19
"""
from alembic import op
import sqlalchemy as sa

revision = "9f1a2b3c4d5e"
down_revision = "fecc6ee139bd"
branch_labels = None
depends_on = None

def upgrade():
    op.add_column("payments", sa.Column("payment_method", sa.String(length=20), nullable=True))
    op.add_column("payments", sa.Column("source_identifier", sa.String(length=255), nullable=True))

def downgrade():
    op.drop_column("payments", "source_identifier")
    op.drop_column("payments", "payment_method")
