from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.application import Application
    from app.models.sprint import Sprint
    from app.models.user import User


class PaymentType(str, Enum):
    DEPOSIT = "DEPOSIT"
    PAYOUT = "PAYOUT"
    REFUND = "REFUND"


class PaymentStatus(str, Enum):
    PENDING = "PENDING"
    HELD = "HELD"
    RELEASED = "RELEASED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        UniqueConstraint("sprint_id", name="uq_payments_sprint"),
        UniqueConstraint(
            "transaction_reference",
            name="uq_payments_transaction_reference",
        ),
        CheckConstraint(
            "payment_type IN ('DEPOSIT', 'PAYOUT', 'REFUND')",
            name="ck_payments_payment_type",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'HELD', 'RELEASED', 'FAILED', 'REFUNDED')",
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

    application_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "applications.id",
            name="fk_payments_application_id_applications",
        ),
        nullable=True,
    )

    payer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", name="fk_payments_payer_id_users"),
        nullable=False,
    )

    payee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", name="fk_payments_payee_id_users"),
        nullable=True,
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="NPR",
        server_default="NPR",
    )

    payment_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=PaymentStatus.PENDING.value,
        server_default=PaymentStatus.PENDING.value,
    )

    is_simulated: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )

    transaction_reference: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    sprint: Mapped[Sprint] = relationship(back_populates="payment")
    application: Mapped[Application | None] = relationship(
        back_populates="payment",
    )
    payer: Mapped[User] = relationship(foreign_keys=[payer_id])
    payee: Mapped[User | None] = relationship(foreign_keys=[payee_id])
