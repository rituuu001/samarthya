"""create applications table

Revision ID: 658f3f87515d
Revises: 9fad683d52ee
Create Date: 2026-11-13 15:57:59.135499

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '658f3f87515d'
down_revision: Union[str, Sequence[str], None] = '9fad683d52ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "applications",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sprint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("applicant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["sprint_id"],
            ["sprints.id"],
            name="fk_applications_sprint_id_sprints",
        ),
        sa.ForeignKeyConstraint(
            ["applicant_id"],
            ["users.id"],
            name="fk_applications_applicant_id_users",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_applications"),
        sa.UniqueConstraint(
            "sprint_id",
            "applicant_id",
            name="uq_applications_sprint_applicant",
        ),
    )
    op.create_index(
        "uq_applications_one_selected_per_sprint",
        "applications",
        ["sprint_id"],
        unique=True,
        postgresql_where=sa.text("status = 'SELECTED'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        "uq_applications_one_selected_per_sprint",
        table_name="applications",
    )
    op.drop_table("applications")
