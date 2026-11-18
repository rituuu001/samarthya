from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.submission import SubmissionRevisionStatus, SubmissionStatus
from app.schemas.payment import PaymentSummary
from app.schemas.proof_record import ProofSummary


class RubricScores(BaseModel):
    functionality_score: int = Field(ge=0, le=10)
    code_quality_score: int = Field(ge=0, le=10)
    completeness_score: int = Field(ge=0, le=10)
    timeliness_score: int = Field(ge=0, le=10)


class SubmissionCreate(BaseModel):
    description: str | None = None
    file_ids: list[str] | None = None


class RevisionRequest(RubricScores):
    requested_changes: str | None = None


class SubmissionResubmit(BaseModel):
    description: str | None = None
    file_ids: list[str] | None = None


class SubmissionApprovalRequest(RubricScores):
    pass


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
    functionality_score: int | None = None
    code_quality_score: int | None = None
    completeness_score: int | None = None
    timeliness_score: int | None = None
    average_score: float | None = None

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
