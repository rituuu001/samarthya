"""add employer onboarding fields to user_profiles

Revision ID: 7f3a9c2e1d4b
Revises: c7d4e81a9f23
Create Date: 2026-11-18 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7f3a9c2e1d4b'
down_revision: Union[str, Sequence[str], None] = 'c7d4e81a9f23'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "user_profiles",
        sa.Column("position", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("organization_type", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("organization_size", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "user_profiles",
        sa.Column("phone_number", sa.String(length=25), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("user_profiles", "position")
    op.drop_column("user_profiles", "organization_type")
    op.drop_column("user_profiles", "organization_size")
    op.drop_column("user_profiles", "phone_number")
