from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.submission import SubmissionRevisionStatus, SubmissionStatus
from app.schemas.payment import PaymentSummary
from app.schemas.proof_record import ProofSummary


class SubmissionCreate(BaseModel):
    description: str | None = None
    file_ids: list[str] | None = None


class RevisionRequest(BaseModel):
    requested_changes: str | None = None


class SubmissionResubmit(BaseModel):
    description: str | None = None
    file_ids: list[str] | None = None


class SubmissionResponse(BaseModel):
    id: UUID
    application_id: UUID
    description: str | None
    file_ids: list[str] | None
    current_revision_number: int
    status: SubmissionStatus
    submitted_at: datetime | None
    reviewed_at: datetime | None
    approved_at: datetime | None
    created_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SubmissionRevisionResponse(BaseModel):
    id: UUID
    submission_id: UUID
    revision_number: int
    requested_changes: str | None
    resubmission_description: str | None
    file_ids: list[str] | None
    status: SubmissionRevisionStatus
    requested_at: datetime | None
    resubmitted_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class SubmissionDetailResponse(SubmissionResponse):
    payment: PaymentSummary | None
    proof: ProofSummary | None
    revision: SubmissionRevisionResponse | None
