"""remove unnecessary uniqueness from payment application association

Revision ID: c10a6bc43d21
Revises: a04c7e9d51b2
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c10a6bc43d21"
down_revision: Union[str, Sequence[str], None] = "a04c7e9d51b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("uq_payments_application", "payments", type_="unique")


def downgrade() -> None:
    connection = op.get_bind()
    duplicate_application = connection.execute(
        sa.text(
            """
            SELECT application_id
            FROM payments
            WHERE application_id IS NOT NULL
            GROUP BY application_id
            HAVING count(*) > 1
            LIMIT 1
            """
        )
    ).scalar_one_or_none()
    if duplicate_application is not None:
        raise RuntimeError(
            "Cannot recreate uq_payments_application while duplicate "
            "application_id values exist"
        )

    op.create_unique_constraint(
        "uq_payments_application",
        "payments",
        ["application_id"],
    )
