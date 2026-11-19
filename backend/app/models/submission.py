import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.proof_record import ProofRecord


class SubmissionStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    APPROVED = "APPROVED"


class SubmissionRevisionStatus(str, Enum):
    REVISION_REQUESTED = "REVISION_REQUESTED"
    RESUBMITTED = "RESUBMITTED"


class SprintSubmission(Base):
    __tablename__ = "sprint_submissions"
    __table_args__ = (
        UniqueConstraint(
            "application_id",
            name="uq_sprint_submissions_application",
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

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    file_ids: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    current_revision_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    functionality_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    code_quality_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    completeness_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    timeliness_score: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    @property
    def average_score(self) -> float | None:
        scores = [
            self.functionality_score,
            self.code_quality_score,
            self.completeness_score,
            self.timeliness_score,
        ]
        if any(score is None for score in scores):
            return None
        return sum(scores) / 4.0

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    proof_record: Mapped[ProofRecord | None] = relationship(
        back_populates="submission",
    )


class SubmissionRevision(Base):
    __tablename__ = "submission_revisions"
    __table_args__ = (
        UniqueConstraint(
            "submission_id",
            "revision_number",
            name="uq_submission_revisions_number",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprint_submissions.id"),
        nullable=False,
    )

    revision_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    requested_changes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    resubmission_description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    file_ids: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    resubmitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
