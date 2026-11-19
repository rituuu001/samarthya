"""add rubric scores to sprint submissions

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-18 17:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sprint_submissions", sa.Column("functionality_score", sa.Integer(), nullable=True))
    op.add_column("sprint_submissions", sa.Column("code_quality_score", sa.Integer(), nullable=True))
    op.add_column("sprint_submissions", sa.Column("completeness_score", sa.Integer(), nullable=True))
    op.add_column("sprint_submissions", sa.Column("timeliness_score", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("sprint_submissions", "timeliness_score")
    op.drop_column("sprint_submissions", "completeness_score")
    op.drop_column("sprint_submissions", "code_quality_score")
    op.drop_column("sprint_submissions", "functionality_score")
