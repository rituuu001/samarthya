"""add purpose check constraint to file_assets

Revision ID: 09b420c71a72
Revises: d43d22af0ffb
Create Date: 2026-11-22 23:42:49.421188

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '09b420c71a72'
down_revision: Union[str, Sequence[str], None] = 'd43d22af0ffb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_check_constraint(
        "ck_file_assets_purpose",
        "file_assets",
        "purpose IN ('IDENTITY_EVIDENCE', 'BUSINESS_EVIDENCE', 'SPRINT_SUBMISSION', 'SPRINT_ATTACHMENT')",
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("ck_file_assets_purpose", "file_assets", type_="check")
