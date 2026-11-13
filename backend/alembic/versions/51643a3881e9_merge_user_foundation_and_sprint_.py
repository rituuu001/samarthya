"""Merge user foundation and sprint migrations

Revision ID: 51643a3881e9
Revises: 23efe59edeed, 40514c544c23
Create Date: 2026-11-13 13:13:00.869059

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '51643a3881e9'
down_revision: Union[str, Sequence[str], None] = ('23efe59edeed', '40514c544c23')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
