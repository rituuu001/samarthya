"""align sprint schema

Revision ID: 9fad683d52ee
Revises: afb4cd5cb0a0
Create Date: 2026-11-13 15:17:16.081783

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '9fad683d52ee'
down_revision: Union[str, Sequence[str], None] = 'afb4cd5cb0a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index("ix_sprints_id", table_name="sprints")
    op.drop_constraint("sprints_pkey", "sprints", type_="primary")
    op.alter_column("sprints", "id", server_default=None)
    op.execute("DROP SEQUENCE IF EXISTS sprints_id_seq")
    op.alter_column(
        "sprints",
        "id",
        existing_type=sa.Integer(),
        type_=postgresql.UUID(as_uuid=True),
        existing_nullable=False,
        postgresql_using="gen_random_uuid()",
    )
    op.create_primary_key("sprints_pkey", "sprints", ["id"])
    op.create_index("ix_sprints_id", "sprints", ["id"], unique=False)

    op.alter_column(
        "sprints",
        "skill",
        new_column_name="skill_category",
        existing_type=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "sprints",
        "payment_amount",
        new_column_name="budget",
        existing_type=sa.Numeric(precision=10, scale=2),
        existing_nullable=False,
    )
    op.alter_column(
        "sprints",
        "difficulty",
        existing_type=sa.String(length=50),
        type_=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="left(difficulty, 20)",
    )
    op.alter_column(
        "sprints",
        "status",
        existing_type=sa.String(length=50),
        type_=sa.String(length=20),
        existing_nullable=False,
        postgresql_using="left(status, 20)",
    )

    op.add_column(
        "sprints",
        sa.Column("task_type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "sprints",
        sa.Column("currency", sa.String(length=10), nullable=True),
    )
    op.add_column(
        "sprints",
        sa.Column("number_of_positions", sa.Integer(), nullable=True),
    )
    op.add_column(
        "sprints",
        sa.Column("revision_limit", sa.Integer(), nullable=True),
    )
    op.add_column(
        "sprints",
        sa.Column(
            "application_deadline",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE sprints
        SET task_type = COALESCE(task_type, 'GENERAL'),
            currency = COALESCE(currency, 'USD'),
            number_of_positions = COALESCE(number_of_positions, 1),
            revision_limit = COALESCE(revision_limit, 0),
            application_deadline = COALESCE(application_deadline, deadline)
        """
    )
    for column in (
        "task_type",
        "currency",
        "number_of_positions",
        "revision_limit",
        "application_deadline",
    ):
        op.alter_column(
            "sprints",
            column,
            existing_nullable=True,
            nullable=False,
        )

    op.alter_column(
        "sprints",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        nullable=True,
    )
    op.alter_column(
        "sprints",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        nullable=True,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index("ix_sprints_id", table_name="sprints")
    op.drop_constraint("sprints_pkey", "sprints", type_="primary")

    op.add_column(
        "sprints",
        sa.Column("legacy_id", sa.Integer(), nullable=True),
    )
    op.execute(
        """
        WITH numbered AS (
            SELECT ctid, row_number() OVER (ORDER BY id) AS new_id
            FROM sprints
        )
        UPDATE sprints AS target
        SET legacy_id = numbered.new_id
        FROM numbered
        WHERE target.ctid = numbered.ctid
        """
    )
    op.alter_column(
        "sprints",
        "legacy_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("sprints", "id")
    op.alter_column(
        "sprints",
        "legacy_id",
        new_column_name="id",
        existing_type=sa.Integer(),
        existing_nullable=False,
    )
    op.create_primary_key("sprints_pkey", "sprints", ["id"])
    op.create_index("ix_sprints_id", "sprints", ["id"], unique=False)

    op.drop_column("sprints", "application_deadline")
    op.drop_column("sprints", "revision_limit")
    op.drop_column("sprints", "number_of_positions")
    op.drop_column("sprints", "currency")
    op.drop_column("sprints", "task_type")
    op.alter_column(
        "sprints",
        "budget",
        new_column_name="payment_amount",
        existing_type=sa.Numeric(precision=10, scale=2),
        existing_nullable=False,
    )
    op.alter_column(
        "sprints",
        "skill_category",
        new_column_name="skill",
        existing_type=sa.String(length=100),
        existing_nullable=False,
    )
    op.alter_column(
        "sprints",
        "difficulty",
        existing_type=sa.String(length=20),
        type_=sa.String(length=50),
        existing_nullable=False,
    )
    op.alter_column(
        "sprints",
        "status",
        existing_type=sa.String(length=20),
        type_=sa.String(length=50),
        existing_nullable=False,
    )
    op.execute(
        """
        UPDATE sprints
        SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
            updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
        """
    )
    op.alter_column(
        "sprints",
        "created_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        nullable=False,
    )
    op.alter_column(
        "sprints",
        "updated_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        nullable=False,
    )
    op.execute("CREATE SEQUENCE sprints_id_seq OWNED BY sprints.id")
    op.execute(
        """
        SELECT setval(
            'sprints_id_seq',
            COALESCE(MAX(id), 1),
            MAX(id) IS NOT NULL
        )
        FROM sprints
        """
    )
    op.execute(
        "ALTER TABLE sprints ALTER COLUMN id "
        "SET DEFAULT nextval('sprints_id_seq')"
    )
