from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.payment import Payment
    from app.models.submission import SprintSubmission


class ProofRecord(Base):
    __tablename__ = "proof_records"
    __table_args__ = (
        UniqueConstraint("payment_id", name="uq_proof_records_payment"),
        UniqueConstraint("submission_id", name="uq_proof_records_submission"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", name="fk_proof_records_payment_id_payments"),
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

    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
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

    payment: Mapped[Payment] = relationship(back_populates="proof_record")
    submission: Mapped[SprintSubmission] = relationship(
        back_populates="proof_record",
    )
