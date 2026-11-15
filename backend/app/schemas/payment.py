from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.payment import PaymentStatus, PaymentType


class PaymentSummary(BaseModel):
    id: UUID
    amount: Decimal
    currency: str
    payment_type: PaymentType
    status: PaymentStatus
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class PaymentHistoryResponse(BaseModel):
    id: UUID
    sprint_id: UUID
    sprint_title: str
    application_id: UUID | None
    amount: Decimal
    currency: str
    payment_type: PaymentType
    status: PaymentStatus
    is_simulated: bool
    transaction_reference: str | None
    created_at: datetime | None
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
