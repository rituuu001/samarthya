"""add sprint payment account

Revision ID: a9b32d84e71c
Revises: f48b7d1c9a62
Create Date: 2026-11-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a9b32d84e71c"
down_revision: Union[str, Sequence[str], None] = "f48b7d1c9a62"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "sprints",
        sa.Column("payment_account_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_sprints_payment_account_id_employer_payment_accounts",
        "sprints",
        "employer_payment_accounts",
        ["payment_account_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_sprints_payment_account_id_employer_payment_accounts",
        "sprints",
        type_="foreignkey",
    )
    op.drop_column("sprints", "payment_account_id")
