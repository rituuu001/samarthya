import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.payment import Payment


class ApplicationStatus(str, Enum):
    APPLIED = "APPLIED"
    ASSESSMENT_SUBMITTED = "ASSESSMENT_SUBMITTED"
    SHORTLISTED = "SHORTLISTED"
    SELECTED = "SELECTED"


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        UniqueConstraint(
            "sprint_id",
            "applicant_id",
            name="uq_applications_sprint_applicant",
        ),
        Index(
            "uq_applications_one_selected_per_sprint",
            "sprint_id",
            unique=True,
            postgresql_where=text("status = 'SELECTED'"),
            sqlite_where=text("status = 'SELECTED'"),
        ),
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

    applicant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default=ApplicationStatus.APPLIED.value,
    )

    applied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    payment: Mapped[Payment | None] = relationship(
        back_populates="selected_application",
    )
