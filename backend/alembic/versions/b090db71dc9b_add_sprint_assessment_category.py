"""add sprint assessment category

Revision ID: b090db71dc9b
Revises: fecc6ee139bd
Create Date: 2026-11-15 12:47:54.167616

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b090db71dc9b'
down_revision: Union[str, Sequence[str], None] = 'fecc6ee139bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sprints",
        sa.Column("assessment_category", sa.String(length=100), nullable=False),
    )
    op.create_check_constraint(
        "ck_sprints_assessment_category",
        "sprints",
        "assessment_category IN ('Python', 'Frontend', 'Graphic Design')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_sprints_assessment_category",
        "sprints",
        type_="check",
    )
    op.drop_column("sprints", "assessment_category")
