"""create sprint submission tables

Revision ID: 184ae2c5f03a
Revises: 658f3f87515d
Create Date: 2026-11-13 16:28:01.514194

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '184ae2c5f03a'
down_revision: Union[str, Sequence[str], None] = '658f3f87515d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "sprint_submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "application_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("current_revision_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
            name="fk_sprint_submissions_application_id_applications",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_sprint_submissions"),
        sa.UniqueConstraint(
            "application_id",
            name="uq_sprint_submissions_application",
        ),
    )
    op.create_table(
        "submission_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "submission_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("requested_changes", sa.Text(), nullable=True),
        sa.Column("resubmission_description", sa.Text(), nullable=True),
        sa.Column("file_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("requested_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resubmitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["sprint_submissions.id"],
            name="fk_submission_revisions_submission_id_sprint_submissions",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_submission_revisions"),
        sa.UniqueConstraint(
            "submission_id",
            "revision_number",
            name="uq_submission_revisions_number",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("submission_revisions")
    op.drop_table("sprint_submissions")
