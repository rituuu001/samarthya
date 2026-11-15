from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssessmentQuestionResponse(BaseModel):
    id: UUID
    question_type: str
    prompt: str
    instructions: str | None
    position: int
    points: Decimal
    candidate_config: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class AssignedAssessmentResponse(BaseModel):
    sprint_assessment_id: UUID
    sprint_id: UUID
    title: str
    description: str | None
    duration_minutes: int
    deadline: datetime
    questions: list[AssessmentQuestionResponse]


class AssessmentAttemptResponse(BaseModel):
    id: UUID
    application_id: UUID
    sprint_assessment_id: UUID
    status: str
    started_at: datetime
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssessmentAnswerSubmission(BaseModel):
    question_id: UUID
    response: Any


class AssessmentSubmission(BaseModel):
    answers: list[AssessmentAnswerSubmission] = Field(default_factory=list)


class AssessmentResultResponse(BaseModel):
    attempt_id: UUID
    status: str
    score: Decimal
    max_score: Decimal
    percentage: Decimal
    passed: bool
    submitted_at: datetime


class EmployerAssessmentResultResponse(BaseModel):
    application_id: UUID
    applicant_id: UUID
    applicant_name: str | None
    attempt_status: str
    score: Decimal | None
    max_score: Decimal | None
    percentage: Decimal | None
    passed: bool | None
    submitted_at: datetime | None
