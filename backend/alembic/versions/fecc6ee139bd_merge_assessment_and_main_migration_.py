"""merge assessment and main migration heads

Revision ID: fecc6ee139bd
Revises: b67a9031e5c4, d71c6a9f208b
Create Date: 2026-11-15 11:38:57.066270

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fecc6ee139bd'
down_revision: Union[str, Sequence[str], None] = ('b67a9031e5c4', 'd71c6a9f208b')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
