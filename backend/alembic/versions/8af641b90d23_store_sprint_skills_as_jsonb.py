"""store Sprint skill categories as JSONB lists

Revision ID: 8af641b90d23
Revises: d71a4c26e09f
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "8af641b90d23"
down_revision: Union[str, Sequence[str], None] = "d71a4c26e09f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    invalid_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM sprints
            WHERE skill_category IS NULL
               OR regexp_replace(
                    skill_category,
                    '^[[:space:]]+|[[:space:]]+$',
                    '',
                    'g'
               ) = ''
               OR NOT EXISTS (
                    SELECT 1
                    FROM unnest(string_to_array(skill_category, ',')) AS skill(value)
                    WHERE regexp_replace(
                        skill.value,
                        '^[[:space:]]+|[[:space:]]+$',
                        '',
                        'g'
                    ) <> ''
               )
            """
        )
    ).scalar_one()
    if invalid_rows:
        raise RuntimeError(
            "Cannot convert empty Sprint skill_category values to JSONB lists"
        )

    op.add_column(
        "sprints",
        sa.Column("skill_category_jsonb", postgresql.JSONB(), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE sprints AS sprint
            SET skill_category_jsonb = (
                SELECT jsonb_agg(
                    regexp_replace(
                        skill.value,
                        '^[[:space:]]+|[[:space:]]+$',
                        '',
                        'g'
                    )
                    ORDER BY skill.ordinal
                )
                FROM unnest(string_to_array(sprint.skill_category, ','))
                    WITH ORDINALITY AS skill(value, ordinal)
                WHERE regexp_replace(
                    skill.value,
                    '^[[:space:]]+|[[:space:]]+$',
                    '',
                    'g'
                ) <> ''
            )
            """
        )
    )

    unresolved_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM sprints
            WHERE skill_category_jsonb IS NULL
            """
        )
    ).scalar_one()
    if unresolved_rows:
        raise RuntimeError(
            "Cannot convert one or more Sprint skill_category values to JSONB"
        )

    op.alter_column(
        "sprints",
        "skill_category_jsonb",
        existing_type=postgresql.JSONB(),
        nullable=False,
    )
    op.drop_column("sprints", "skill_category")
    op.alter_column(
        "sprints",
        "skill_category_jsonb",
        new_column_name="skill_category",
        existing_type=postgresql.JSONB(),
        existing_nullable=False,
    )


def downgrade() -> None:
    connection = op.get_bind()
    invalid_array_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM sprints
            WHERE CASE
                WHEN jsonb_typeof(skill_category) = 'array'
                    THEN jsonb_array_length(skill_category) = 0
                ELSE TRUE
            END
            """
        )
    ).scalar_one()
    if invalid_array_rows:
        raise RuntimeError(
            "Cannot downgrade empty or non-array Sprint skill_category values"
        )

    invalid_skill_rows = connection.execute(
        sa.text(
            """
            SELECT count(DISTINCT sprint.id)
            FROM sprints AS sprint
            CROSS JOIN LATERAL jsonb_array_elements(sprint.skill_category)
                WITH ORDINALITY AS skill(value, ordinal)
            WHERE jsonb_typeof(skill.value) <> 'string'
               OR skill.value #>> '{}' = ''
               OR skill.value #>> '{}' <> regexp_replace(
                    skill.value #>> '{}',
                    '^[[:space:]]+|[[:space:]]+$',
                    '',
                    'g'
               )
               OR position(',' IN skill.value #>> '{}') > 0
            """
        )
    ).scalar_one()
    if invalid_skill_rows:
        raise RuntimeError(
            "Cannot downgrade Sprint skills that are not normalized, "
            "comma-free strings"
        )

    overlength_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM (
                SELECT sprint.id
                FROM sprints AS sprint
                CROSS JOIN LATERAL jsonb_array_elements(sprint.skill_category)
                    WITH ORDINALITY AS skill(value, ordinal)
                GROUP BY sprint.id
                HAVING char_length(
                    string_agg(skill.value #>> '{}', ', ' ORDER BY skill.ordinal)
                ) > 100
            ) AS overlength
            """
        )
    ).scalar_one()
    if overlength_rows:
        raise RuntimeError(
            "Cannot downgrade Sprint skills whose comma-separated value "
            "exceeds the previous VARCHAR(100) limit"
        )

    op.add_column(
        "sprints",
        sa.Column("skill_category_varchar", sa.String(length=100), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE sprints AS sprint
            SET skill_category_varchar = (
                SELECT string_agg(skill.value #>> '{}', ', ' ORDER BY skill.ordinal)
                FROM jsonb_array_elements(sprint.skill_category)
                    WITH ORDINALITY AS skill(value, ordinal)
            )
            """
        )
    )
    op.alter_column(
        "sprints",
        "skill_category_varchar",
        existing_type=sa.String(length=100),
        nullable=False,
    )
    op.drop_column("sprints", "skill_category")
    op.alter_column(
        "sprints",
        "skill_category_varchar",
        new_column_name="skill_category",
        existing_type=sa.String(length=100),
        existing_nullable=False,
    )
