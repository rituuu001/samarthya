"""add sprint attachments and external links

Revision ID: e5f6a7b8c9d0
Revises: 09b420c71a72
Create Date: 2026-11-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "09b420c71a72"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sprints",
        sa.Column(
            "attachment_file_ids",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "sprints",
        sa.Column(
            "external_links",
            postgresql.JSONB(),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )


def downgrade() -> None:
    op.drop_column("sprints", "external_links")
    op.drop_column("sprints", "attachment_file_ids")
