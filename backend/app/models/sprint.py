import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.payment import Payment


class Sprint(Base):
    __tablename__ = "sprints"
    __table_args__ = (
        CheckConstraint(
            "assessment_category IN ('Python', 'Frontend', 'Graphic Design')",
            name="ck_sprints_assessment_category",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        index=True,
        default=uuid.uuid4,
    )

    employer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    assessment_category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    skill_category: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
    )

    difficulty: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    task_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    budget: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    number_of_positions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    revision_limit: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    application_deadline: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    attachment_file_ids: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )

    external_links: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="DRAFT",
    )

    created_at: Mapped[datetime | None] = mapped_column(
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

    payment: Mapped[Payment | None] = relationship(back_populates="sprint")
