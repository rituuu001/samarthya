"""create employer payment accounts

Revision ID: f48b7d1c9a62
Revises: d43d22af0ffb
Create Date: 2026-11-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "f48b7d1c9a62"
down_revision: Union[str, Sequence[str], None] = "d43d22af0ffb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employer_payment_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("employer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("account_type", sa.String(length=20), nullable=False),
        sa.Column("account_identifier", sa.String(length=255), nullable=False),
        sa.Column(
            "is_default",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["employer_id"],
            ["users.id"],
            name="fk_employer_payment_accounts_employer_id_users",
        ),
        sa.CheckConstraint(
            "account_type IN ('esewa', 'khalti', 'bank')",
            name="ck_employer_payment_accounts_account_type",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_employer_payment_accounts"),
    )
    op.create_index(
        "uq_employer_payment_accounts_default_per_employer",
        "employer_payment_accounts",
        ["employer_id"],
        unique=True,
        postgresql_where=sa.text("is_default = true"),
    )


def downgrade() -> None:
    op.drop_index(
        "uq_employer_payment_accounts_default_per_employer",
        table_name="employer_payment_accounts",
    )
    op.drop_table("employer_payment_accounts")
