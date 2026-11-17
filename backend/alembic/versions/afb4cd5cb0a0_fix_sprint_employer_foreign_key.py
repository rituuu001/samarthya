"""Fix sprint employer foreign key

Revision ID: afb4cd5cb0a0
Revises: 51643a3881e9
Create Date: 2026-11-13 13:49:06.307159

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "afb4cd5cb0a0"
down_revision: Union[str, Sequence[str], None] = "51643a3881e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("sprints", "employer_id")

    op.add_column(
        "sprints",
        sa.Column(
            "employer_id",
            sa.UUID(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("sprints", "employer_id")

    op.add_column(
        "sprints",
        sa.Column(
            "employer_id",
            sa.INTEGER(),
            nullable=False,
        ),
    )