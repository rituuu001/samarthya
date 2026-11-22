"""allow Junior Accountant assessment categories

Revision ID: c9f71a20b4d8
Revises: b090db71dc9b
Create Date: 2026-11-23

"""
from typing import Sequence, Union

from alembic import op


revision: str = "c9f71a20b4d8"
down_revision: Union[str, Sequence[str], None] = "b090db71dc9b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "ck_assessment_templates_skill",
        "assessment_templates",
        type_="check",
    )
    op.create_check_constraint(
        "ck_assessment_templates_skill",
        "assessment_templates",
        "skill IN ('Python', 'Frontend', 'Junior Accountant', 'Graphic Design')",
    )

    op.drop_constraint(
        "ck_sprints_assessment_category",
        "sprints",
        type_="check",
    )
    op.create_check_constraint(
        "ck_sprints_assessment_category",
        "sprints",
        "assessment_category IN "
        "('Python', 'Frontend', 'Junior Accountant', 'Graphic Design')",
    )


def downgrade() -> None:
    raise RuntimeError(
        "This migration is forward-only. Downgrading would reject Junior "
        "Accountant records; preserve the data and create a separate migration "
        "if a rollback is required."
    )
