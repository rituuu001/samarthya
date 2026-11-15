"""create assessment tables

Revision ID: d71c6a9f208b
Revises: 184ae2c5f03a
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "d71c6a9f208b"
down_revision: Union[str, Sequence[str], None] = "184ae2c5f03a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assessment_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("skill", sa.String(length=100), nullable=False),
        sa.Column("difficulty", sa.String(length=50), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "skill IN ('Python', 'Frontend', 'Graphic Design')",
            name="ck_assessment_templates_skill",
        ),
        sa.CheckConstraint(
            "difficulty IN ('Beginner', 'Intermediate')",
            name="ck_assessment_templates_difficulty",
        ),
        sa.CheckConstraint("version > 0", name="ck_assessment_templates_version"),
        sa.CheckConstraint(
            "duration_minutes = 30",
            name="ck_assessment_templates_duration",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "skill",
            "difficulty",
            "version",
            name="uq_assessment_templates_skill_difficulty_version",
        ),
    )
    op.create_index(
        "uq_assessment_templates_active_skill_difficulty",
        "assessment_templates",
        ["skill", "difficulty"],
        unique=True,
        postgresql_where=sa.text("is_active IS TRUE"),
    )

    op.create_table(
        "assessment_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("question_type", sa.String(length=30), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("points", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column(
            "candidate_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "grading_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "question_type IN "
            "('CONCEPT', 'SHORT_ANSWER', 'MCQ', 'CODE_OUTPUT', "
            "'DEBUGGING', 'PRACTICAL')",
            name="ck_assessment_questions_type",
        ),
        sa.CheckConstraint("points > 0", name="ck_assessment_questions_points"),
        sa.ForeignKeyConstraint(
            ["template_id"],
            ["assessment_templates.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "template_id",
            "position",
            name="uq_assessment_questions_template_position",
        ),
    )

    op.create_table(
        "sprint_assessments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sprint_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("template_version", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["sprint_id"], ["sprints.id"]),
        sa.ForeignKeyConstraint(["template_id"], ["assessment_templates.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "sprint_id",
            name="uq_sprint_assessments_sprint",
        ),
    )

    op.create_table(
        "sprint_assessment_questions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "sprint_assessment_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "source_question_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
        sa.Column("question_type", sa.String(length=30), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("points", sa.Numeric(precision=8, scale=2), nullable=False),
        sa.Column(
            "candidate_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column(
            "grading_config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "question_type IN "
            "('CONCEPT', 'SHORT_ANSWER', 'MCQ', 'CODE_OUTPUT', "
            "'DEBUGGING', 'PRACTICAL')",
            name="ck_sprint_assessment_questions_type",
        ),
        sa.CheckConstraint(
            "points > 0",
            name="ck_sprint_assessment_questions_points",
        ),
        sa.ForeignKeyConstraint(
            ["sprint_assessment_id"],
            ["sprint_assessments.id"],
        ),
        sa.ForeignKeyConstraint(
            ["source_question_id"],
            ["assessment_questions.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "sprint_assessment_id",
            "position",
            name="uq_sprint_assessment_questions_position",
        ),
    )

    op.create_table(
        "assessment_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("application_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "sprint_assessment_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("score", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("max_score", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')",
            name="ck_assessment_attempts_status",
        ),
        sa.ForeignKeyConstraint(
            ["application_id"],
            ["applications.id"],
        ),
        sa.ForeignKeyConstraint(
            ["sprint_assessment_id"],
            ["sprint_assessments.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "application_id",
            name="uq_assessment_attempts_application",
        ),
    )

    op.create_table(
        "assessment_answers",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("attempt_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "sprint_assessment_question_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
        ),
        sa.Column(
            "response",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("awarded_points", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["assessment_attempts.id"]),
        sa.ForeignKeyConstraint(
            ["sprint_assessment_question_id"],
            ["sprint_assessment_questions.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "attempt_id",
            "sprint_assessment_question_id",
            name="uq_assessment_answers_attempt_question",
        ),
    )


def downgrade() -> None:
    op.drop_table("assessment_answers")
    op.drop_table("assessment_attempts")
    op.drop_table("sprint_assessment_questions")
    op.drop_table("sprint_assessments")
    op.drop_table("assessment_questions")
    op.drop_index(
        "uq_assessment_templates_active_skill_difficulty",
        table_name="assessment_templates",
    )
    op.drop_table("assessment_templates")
