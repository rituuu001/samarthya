"""align proof records with approved schema

Revision ID: d71a4c26e09f
Revises: c10a6bc43d21
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "d71a4c26e09f"
down_revision: Union[str, Sequence[str], None] = "c10a6bc43d21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_SKILLS_JSON = """
COALESCE(
    (
        SELECT jsonb_agg(btrim(skill.value) ORDER BY skill.ordinal)
        FROM unnest(string_to_array(sprint.skill_category, ',')) WITH ORDINALITY
            AS skill(value, ordinal)
        WHERE btrim(skill.value) <> ''
    ),
    '[]'::jsonb
)
"""


def upgrade() -> None:
    op.add_column(
        "proof_records",
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("sprint_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("title", sa.String(length=200), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("description", sa.Text(), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("skills_demonstrated", postgresql.JSONB(), nullable=True),
    )
    op.alter_column(
        "proof_records",
        "issued_at",
        new_column_name="verified_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
        nullable=True,
    )

    op.execute(
        sa.text(
            f"""
            UPDATE proof_records AS proof
            SET owner_id = application.applicant_id,
                sprint_id = application.sprint_id,
                title = sprint.title,
                description = sprint.description,
                skills_demonstrated = {_SKILLS_JSON}
            FROM sprint_submissions AS submission
            JOIN applications AS application
              ON application.id = submission.application_id
            JOIN sprints AS sprint
              ON sprint.id = application.sprint_id
            WHERE proof.submission_id = submission.id
            """
        )
    )

    unresolved_rows = op.get_bind().execute(
        sa.text(
            """
            SELECT count(*)
            FROM proof_records
            WHERE owner_id IS NULL
               OR sprint_id IS NULL
               OR title IS NULL
            """
        )
    ).scalar_one()
    if unresolved_rows:
        raise RuntimeError(
            "Cannot migrate ProofRecords whose submission, application, or "
            "Sprint does not provide the required owner, Sprint, and title"
        )

    op.alter_column(
        "proof_records",
        "owner_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        "proof_records",
        "sprint_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        "proof_records",
        "title",
        existing_type=sa.String(length=200),
        nullable=False,
    )
    op.create_foreign_key(
        "fk_proof_records_owner_id_users",
        "proof_records",
        "users",
        ["owner_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_proof_records_sprint_id_sprints",
        "proof_records",
        "sprints",
        ["sprint_id"],
        ["id"],
    )

    op.drop_constraint(
        "uq_proof_records_payment",
        "proof_records",
        type_="unique",
    )
    op.drop_constraint(
        "fk_proof_records_payment_id_payments",
        "proof_records",
        type_="foreignkey",
    )
    op.drop_column("proof_records", "payment_id")
    op.drop_column("proof_records", "updated_at")


def downgrade() -> None:
    connection = op.get_bind()
    non_reconstructible_rows = connection.execute(
        sa.text(
            f"""
            SELECT count(*)
            FROM proof_records AS proof
            JOIN sprint_submissions AS submission
              ON submission.id = proof.submission_id
            JOIN applications AS application
              ON application.id = submission.application_id
            JOIN sprints AS sprint
              ON sprint.id = application.sprint_id
            WHERE proof.owner_id IS DISTINCT FROM application.applicant_id
               OR proof.sprint_id IS DISTINCT FROM sprint.id
               OR proof.title IS DISTINCT FROM sprint.title
               OR proof.description IS DISTINCT FROM sprint.description
               OR proof.skills_demonstrated IS DISTINCT FROM ({_SKILLS_JSON})
               OR proof.verified_at IS NULL
            """
        )
    ).scalar_one()
    if non_reconstructible_rows:
        raise RuntimeError(
            "Cannot downgrade ProofRecords containing values that cannot be "
            "reconstructed from their Submission and Sprint"
        )

    unmappable_rows = connection.execute(
        sa.text(
            """
            SELECT count(*)
            FROM proof_records AS proof
            WHERE NOT EXISTS (
                SELECT 1
                FROM payments AS payment
                WHERE payment.sprint_id = proof.sprint_id
            )
            OR EXISTS (
                SELECT 1
                FROM proof_records AS other
                WHERE other.sprint_id = proof.sprint_id
                  AND other.id <> proof.id
            )
            """
        )
    ).scalar_one()
    if unmappable_rows:
        raise RuntimeError(
            "Cannot downgrade ProofRecords without exactly one matching "
            "Payment per Sprint"
        )

    op.add_column(
        "proof_records",
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "proof_records",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        sa.text(
            """
            UPDATE proof_records AS proof
            SET payment_id = payment.id
            FROM payments AS payment
            WHERE payment.sprint_id = proof.sprint_id
            """
        )
    )
    op.alter_column(
        "proof_records",
        "payment_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    op.alter_column(
        "proof_records",
        "verified_at",
        new_column_name="issued_at",
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=True,
        nullable=False,
    )
    op.create_foreign_key(
        "fk_proof_records_payment_id_payments",
        "proof_records",
        "payments",
        ["payment_id"],
        ["id"],
    )
    op.create_unique_constraint(
        "uq_proof_records_payment",
        "proof_records",
        ["payment_id"],
    )

    op.drop_constraint(
        "fk_proof_records_owner_id_users",
        "proof_records",
        type_="foreignkey",
    )
    op.drop_constraint(
        "fk_proof_records_sprint_id_sprints",
        "proof_records",
        type_="foreignkey",
    )
    op.drop_column("proof_records", "owner_id")
    op.drop_column("proof_records", "sprint_id")
    op.drop_column("proof_records", "title")
    op.drop_column("proof_records", "description")
    op.drop_column("proof_records", "skills_demonstrated")
