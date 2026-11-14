from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.proof_record import ProofRecord
    from app.models.sprint import Sprint


class PaymentStatus(str, Enum):
    LOCKED = "LOCKED"
    RELEASED = "RELEASED"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("sprint_id", name="uq_payments_sprint"),
        UniqueConstraint(
            "selected_application_id",
            name="uq_payments_selected_application",
        ),
        CheckConstraint(
            "status IN ('LOCKED', 'RELEASED')",
            name="ck_payments_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    sprint_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sprints.id", name="fk_payments_sprint_id_sprints"),
        nullable=False,
    )

    selected_application_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "applications.id",
            name="fk_payments_selected_application_id_applications",
        ),
        nullable=True,
    )

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=PaymentStatus.LOCKED.value,
    )

    locked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    released_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
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

    sprint: Mapped[Sprint] = relationship(back_populates="payment")
    selected_application: Mapped[Application | None] = relationship(
        back_populates="payment",
    )
    proof_record: Mapped[ProofRecord | None] = relationship(
        back_populates="payment",
    )
