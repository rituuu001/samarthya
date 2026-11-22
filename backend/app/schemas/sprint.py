from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


AssessmentCategory = Literal["Python", "Frontend", "Graphic Design"]


class ExternalLink(BaseModel):
    url: HttpUrl
    title: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is not None:
            value = value.strip()
            if not value:
                return None
        return value


class SprintAttachmentMetadata(BaseModel):
    id: UUID
    original_filename: str
    mime_type: str
    file_size: int


class SprintCreate(BaseModel):
    title: str
    description: str
    assessment_category: AssessmentCategory
    skill_category: list[str]
    difficulty: str
    task_type: str
    budget: Decimal
    currency: str
    number_of_positions: int
    revision_limit: int
    deadline: datetime
    application_deadline: datetime
    attachment_file_ids: list[UUID] = Field(default_factory=list)
    external_links: list[ExternalLink] = Field(default_factory=list)


class PublishSprintRequest(BaseModel):
    payment_method: str | None = None
    source_identifier: str | None = None


class SprintResponse(BaseModel):
    id: UUID
    employer_id: UUID
    title: str
    description: str
    assessment_category: AssessmentCategory
    skill_category: list[str]
    difficulty: str
    task_type: str
    budget: Decimal
    currency: str
    number_of_positions: int
    revision_limit: int
    deadline: datetime
    application_deadline: datetime
    attachment_file_ids: list[UUID] = Field(default_factory=list)
    external_links: list[ExternalLink] = Field(default_factory=list)
    attachments: list[SprintAttachmentMetadata] = Field(default_factory=list)
    status: str
    created_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class MarketplaceSprintResponse(SprintResponse):
    organization_name: str | None = None
