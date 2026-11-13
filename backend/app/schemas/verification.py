from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel,ConfigDict


class VerificationCreate(BaseModel):
    verification_type: Literal["IDENTITY", "BUSINESS"]
    evidence_file_id: UUID


class VerificationReview(BaseModel):
    status: Literal["APPROVED", "REJECTED"]
    review_reason: str | None = None


class VerificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    verification_type: str
    status: str
    evidence_file_id: UUID | None
    review_reason: str | None
    created_at: datetime
    updated_at: datetime