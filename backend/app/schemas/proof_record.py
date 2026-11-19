from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ProofSummary(BaseModel):
    id: UUID
    title: str
    description: str | None
    skills_demonstrated: list[str] | None
    verified_at: datetime | None
    is_shared: bool

    model_config = ConfigDict(from_attributes=True)


class ProofRecordResponse(ProofSummary):
    sprint_id: UUID
    submission_id: UUID
    created_at: datetime | None
