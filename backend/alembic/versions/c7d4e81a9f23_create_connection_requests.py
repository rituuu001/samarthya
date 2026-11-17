"""create connection requests

Revision ID: c7d4e81a9f23
Revises: b090db71dc9b
Create Date: 2026-11-15 15:43:22.791300

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'c7d4e81a9f23'
down_revision: Union[str, Sequence[str], None] = 'b090db71dc9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "connection_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
            name="fk_connection_requests_application_id_applications",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_connection_requests"),
        sa.UniqueConstraint(
            "application_id",
            name="uq_connection_requests_application",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("connection_requests")
