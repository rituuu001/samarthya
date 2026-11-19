from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sprint import Sprint
    from app.models.submission import SprintSubmission
    from app.models.user import User


class ProofRecord(Base):
    __tablename__ = "proof_records"
    __table_args__ = (
        UniqueConstraint("submission_id", name="uq_proof_records_submission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", name="fk_proof_records_owner_id_users"),
        nullable=False,
    )

    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprints.id", name="fk_proof_records_sprint_id_sprints"),
        nullable=False,
    )

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "sprint_submissions.id",
            name="fk_proof_records_submission_id_sprint_submissions",
        ),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    skills_demonstrated: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    is_shared: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=True,
    )

    owner: Mapped[User] = relationship(foreign_keys=[owner_id])
    sprint: Mapped[Sprint] = relationship(foreign_keys=[sprint_id])
    submission: Mapped[SprintSubmission] = relationship(
        back_populates="proof_record",
    )
