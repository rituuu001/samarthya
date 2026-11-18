from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus


class ApplicationResponse(BaseModel):
    id: UUID
    sprint_id: UUID
    applicant_id: UUID
    status: ApplicationStatus
    applied_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class EmployerApplicationResponse(BaseModel):
    id: UUID
    sprint_id: UUID
    status: ApplicationStatus
    applied_at: datetime | None
    updated_at: datetime | None
    contributor_code: str

    model_config = ConfigDict(from_attributes=True)
