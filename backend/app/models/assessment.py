import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.application import Application
from app.models.sprint import Sprint


class AssessmentTemplate(Base):
    __tablename__ = "assessment_templates"
    __table_args__ = (
        CheckConstraint(
            "skill IN ('Python', 'Frontend', 'Junior Accountant', 'Graphic Design')",
            name="ck_assessment_templates_skill",
        ),
        CheckConstraint(
            "difficulty IN ('Beginner', 'Intermediate')",
            name="ck_assessment_templates_difficulty",
        ),
        CheckConstraint("version > 0", name="ck_assessment_templates_version"),
        CheckConstraint(
            "duration_minutes = 30",
            name="ck_assessment_templates_duration",
        ),
        UniqueConstraint(
            "skill",
            "difficulty",
            "version",
            name="uq_assessment_templates_skill_difficulty_version",
        ),
        Index(
            "uq_assessment_templates_active_skill_difficulty",
            "skill",
            "difficulty",
            unique=True,
            postgresql_where=text("is_active IS TRUE"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    skill: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    questions: Mapped[list["AssessmentQuestion"]] = relationship(
        back_populates="template",
    )


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"
    __table_args__ = (
        CheckConstraint(
            "question_type IN "
            "('CONCEPT', 'SHORT_ANSWER', 'MCQ', 'CODE_OUTPUT', "
            "'DEBUGGING', 'PRACTICAL')",
            name="ck_assessment_questions_type",
        ),
        CheckConstraint("points > 0", name="ck_assessment_questions_points"),
        UniqueConstraint(
            "template_id",
            "position",
            name="uq_assessment_questions_template_position",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_templates.id"),
        nullable=False,
    )
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    points: Mapped[float] = mapped_column(
        Numeric(8, 2),
        nullable=False,
    )
    candidate_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    grading_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    template: Mapped[AssessmentTemplate] = relationship(back_populates="questions")


class SprintAssessment(Base):
    __tablename__ = "sprint_assessments"
    __table_args__ = (
        UniqueConstraint("sprint_id", name="uq_sprint_assessments_sprint"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprints.id"),
        nullable=False,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_templates.id"),
        nullable=False,
    )
    template_version: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    sprint: Mapped[Sprint] = relationship()
    template: Mapped[AssessmentTemplate] = relationship()
    questions: Mapped[list["SprintAssessmentQuestion"]] = relationship(
        back_populates="sprint_assessment",
    )


class SprintAssessmentQuestion(Base):
    __tablename__ = "sprint_assessment_questions"
    __table_args__ = (
        CheckConstraint(
            "question_type IN "
            "('CONCEPT', 'SHORT_ANSWER', 'MCQ', 'CODE_OUTPUT', "
            "'DEBUGGING', 'PRACTICAL')",
            name="ck_sprint_assessment_questions_type",
        ),
        CheckConstraint(
            "points > 0",
            name="ck_sprint_assessment_questions_points",
        ),
        UniqueConstraint(
            "sprint_assessment_id",
            "position",
            name="uq_sprint_assessment_questions_position",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    sprint_assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprint_assessments.id"),
        nullable=False,
    )
    source_question_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_questions.id", ondelete="SET NULL"),
        nullable=True,
    )
    question_type: Mapped[str] = mapped_column(String(30), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    points: Mapped[float] = mapped_column(
        Numeric(8, 2),
        nullable=False,
    )
    candidate_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
    grading_config: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    sprint_assessment: Mapped[SprintAssessment] = relationship(
        back_populates="questions",
    )
    source_question: Mapped[AssessmentQuestion | None] = relationship()


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"
    __table_args__ = (
        UniqueConstraint(
            "application_id",
            name="uq_assessment_attempts_application",
        ),
        CheckConstraint(
            "status IN ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED')",
            name="ck_assessment_attempts_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    application_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("applications.id"),
        nullable=False,
    )
    sprint_assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprint_assessments.id"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="IN_PROGRESS",
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    score: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )
    max_score: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    sprint_assessment: Mapped[SprintAssessment] = relationship()
    application: Mapped[Application] = relationship()
    answers: Mapped[list["AssessmentAnswer"]] = relationship(
        back_populates="attempt",
    )


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"
    __table_args__ = (
        UniqueConstraint(
            "attempt_id",
            "sprint_assessment_question_id",
            name="uq_assessment_answers_attempt_question",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_attempts.id"),
        nullable=False,
    )
    sprint_assessment_question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprint_assessment_questions.id"),
        nullable=False,
    )
    response: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    awarded_points: Mapped[float | None] = mapped_column(
        Numeric(8, 2),
        nullable=True,
    )
    answered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    attempt: Mapped[AssessmentAttempt] = relationship(back_populates="answers")
    question: Mapped[SprintAssessmentQuestion] = relationship()
