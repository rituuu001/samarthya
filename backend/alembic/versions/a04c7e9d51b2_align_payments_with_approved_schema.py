"""align payments with approved schema

Revision ID: a04c7e9d51b2
Revises: 6de2a2a3f701
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a04c7e9d51b2"
down_revision: Union[str, Sequence[str], None] = "6de2a2a3f701"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_payments_status", "payments", type_="check")
    op.drop_constraint(
        "fk_payments_selected_application_id_applications",
        "payments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_payments_selected_application",
        "payments",
        type_="unique",
    )
    op.alter_column(
        "payments",
        "selected_application_id",
        new_column_name="application_id",
        existing_type=postgresql.UUID(as_uuid=True),
    )
    op.alter_column(
        "payments",
        "released_at",
        new_column_name="completed_at",
        existing_type=sa.DateTime(timezone=True),
    )

    op.add_column(
        "payments",
        sa.Column("payer_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("payee_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("payment_type", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("is_simulated", sa.Boolean(), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("transaction_reference", sa.String(length=255), nullable=True),
    )

    op.execute(
        sa.text(
            """
            UPDATE payments AS payment
            SET payer_id = sprint.employer_id
            FROM sprints AS sprint
            WHERE payment.sprint_id = sprint.id
              AND payment.payer_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE payments AS payment
            SET payee_id = application.applicant_id
            FROM applications AS application
            WHERE payment.application_id = application.id
              AND payment.payee_id IS NULL
            """
        )
    )
    op.execute(
        sa.text(
            """
            UPDATE payments
            SET payment_type = CASE status
                    WHEN 'LOCKED' THEN 'DEPOSIT'
                    WHEN 'RELEASED' THEN 'PAYOUT'
                END,
                status = CASE status
                    WHEN 'LOCKED' THEN 'HELD'
                    ELSE status
                END,
                is_simulated = COALESCE(is_simulated, TRUE),
                created_at = COALESCE(created_at, locked_at)
            """
        )
    )

    op.alter_column(
        "payments",
        "payer_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        "payments",
        "payment_type",
        existing_type=sa.String(length=20),
        nullable=False,
    )
    op.alter_column(
        "payments",
        "is_simulated",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("true"),
    )
    op.alter_column(
        "payments",
        "currency",
        existing_type=sa.String(length=10),
        server_default=sa.text("'NPR'"),
    )
    op.alter_column(
        "payments",
        "status",
        existing_type=sa.String(length=20),
        server_default=sa.text("'PENDING'"),
    )

    op.create_foreign_key(
        "fk_payments_application_id_applications",
        "payments",
        "applications",
        ["application_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_payments_payer_id_users",
        "payments",
        "users",
        ["payer_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_payments_payee_id_users",
        "payments",
        "users",
        ["payee_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_payments_application",
        "payments",
        ["application_id"],
    )
    op.create_unique_constraint(
        "uq_payments_transaction_reference",
        "payments",
        ["transaction_reference"],
    )
    op.create_check_constraint(
        "ck_payments_payment_type",
        "payments",
        "payment_type IN ('DEPOSIT', 'PAYOUT', 'REFUND')",
    )
    op.create_check_constraint(
        "ck_payments_status",
        "payments",
        "status IN ('PENDING', 'HELD', 'RELEASED', 'FAILED', 'REFUNDED')",
    )

    op.drop_column("payments", "locked_at")
    op.drop_column("payments", "updated_at")


def downgrade() -> None:
    connection = op.get_bind()
    unsupported_statuses = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM payments
            WHERE status NOT IN ('HELD', 'RELEASED')
            """
        )
    ).scalar_one()
    if unsupported_statuses:
        raise RuntimeError(
            "Cannot downgrade payments with statuses other than HELD or RELEASED"
        )

    op.drop_constraint("ck_payments_status", "payments", type_="check")
    op.drop_constraint(
        "ck_payments_payment_type",
        "payments",
        type_="check",
    )
    op.drop_constraint(
        "uq_payments_transaction_reference",
        "payments",
        type_="unique",
    )
    op.drop_constraint("uq_payments_application", "payments", type_="unique")
    op.drop_constraint(
        "fk_payments_application_id_applications",
        "payments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_payments_payer_id_users",
        "payments",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_payments_payee_id_users",
        "payments",
        type_="foreignkey",
    )

    op.alter_column(
        "payments",
        "currency",
        existing_type=sa.String(length=10),
        server_default=None,
    )
    op.alter_column(
        "payments",
        "status",
        existing_type=sa.String(length=20),
        server_default=None,
    )

    op.add_column(
        "payments",
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "payments",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE payments
            SET locked_at = COALESCE(created_at, CURRENT_TIMESTAMP),
                status = CASE status
                    WHEN 'HELD' THEN 'LOCKED'
                    ELSE status
                END
            """
        )
    )
    op.alter_column(
        "payments",
        "locked_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )

    op.alter_column(
        "payments",
        "application_id",
        new_column_name="selected_application_id",
        existing_type=postgresql.UUID(as_uuid=True),
    )
    op.alter_column(
        "payments",
        "completed_at",
        new_column_name="released_at",
        existing_type=sa.DateTime(timezone=True),
    )

    op.drop_column("payments", "payer_id")
    op.drop_column("payments", "payee_id")
    op.drop_column("payments", "payment_type")
    op.drop_column("payments", "is_simulated")
    op.drop_column("payments", "transaction_reference")

    op.create_foreign_key(
        "fk_payments_selected_application_id_applications",
        "payments",
        "applications",
        ["selected_application_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_payments_selected_application",
        "payments",
        ["selected_application_id"],
    )
    op.create_check_constraint(
        "ck_payments_status",
        "payments",
        "status IN ('LOCKED', 'RELEASED')",
    )
