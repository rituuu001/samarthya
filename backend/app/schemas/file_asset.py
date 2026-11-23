from datetime import datetime
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict


class FileUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    original_filename: str
    mime_type: str
    file_size: int
    purpose: str
    created_at: datetime


class FileUploadRequest(BaseModel):
    purpose: Literal[
        "IDENTITY_EVIDENCE",
        "BUSINESS_EVIDENCE",
        "SPRINT_SUBMISSION",
        "SPRINT_ATTACHMENT",
    ]