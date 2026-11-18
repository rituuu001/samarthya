"""add is_shared to portfolio_projects and proof_records

Revision ID: a1b2c3d4e5f6
Revises: 7f3a9c2e1d4b
Create Date: 2026-11-18 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "7f3a9c2e1d4b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "portfolio_projects",
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "proof_records",
        sa.Column("is_shared", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("proof_records", "is_shared")
    op.drop_column("portfolio_projects", "is_shared")