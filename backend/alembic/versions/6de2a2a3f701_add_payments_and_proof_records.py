"""add payments and proof records

Revision ID: 6de2a2a3f701
Revises: 184ae2c5f03a
Create Date: 2026-11-13

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "6de2a2a3f701"
down_revision: Union[str, Sequence[str], None] = "184ae2c5f03a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sprint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "selected_application_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('LOCKED', 'RELEASED')",
            name="ck_payments_status",
        ),
        sa.ForeignKeyConstraint(
            ["sprint_id"],
            ["sprints.id"],
            name="fk_payments_sprint_id_sprints",
        ),
        sa.ForeignKeyConstraint(
            ["selected_application_id"],
            ["applications.id"],
            name="fk_payments_selected_application_id_applications",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_payments"),
        sa.UniqueConstraint("sprint_id", name="uq_payments_sprint"),
        sa.UniqueConstraint(
            "selected_application_id",
            name="uq_payments_selected_application",
        ),
    )
    op.create_table(
        "proof_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["payment_id"],
            ["payments.id"],
            name="fk_proof_records_payment_id_payments",
        ),
        sa.ForeignKeyConstraint(
            ["submission_id"],
            ["sprint_submissions.id"],
            name="fk_proof_records_submission_id_sprint_submissions",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_proof_records"),
        sa.UniqueConstraint("payment_id", name="uq_proof_records_payment"),
        sa.UniqueConstraint(
            "submission_id",
            name="uq_proof_records_submission",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("proof_records")
    op.drop_table("payments")
