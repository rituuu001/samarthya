from datetime import datetime
from typing import List

from pydantic import BaseModel, ConfigDict


class SharedProofRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: str | None
    skills_demonstrated: list[str] | None
    verified_at: datetime | None


class SharedProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str
    description: str | None
    skills_used: list[str] | None
    project_url: str | None


class SharedEvidenceResponse(BaseModel):
    proof_records: list[SharedProofRecordResponse]
    projects: list[SharedProjectResponse]
