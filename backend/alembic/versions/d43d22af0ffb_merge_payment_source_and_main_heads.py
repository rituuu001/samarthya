"""merge payment source and main heads

Revision ID: d43d22af0ffb
Revises: 9f1a2b3c4d5e, b2c3d4e5f6a7
Create Date: 2026-11-19 18:09:22.254417

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd43d22af0ffb'
down_revision: Union[str, Sequence[str], None] = ('9f1a2b3c4d5e', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
