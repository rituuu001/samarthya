from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PortfolioProjectCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(max_length=200)
    description: str | None = None
    skills_used: list[str] | None = None
    project_url: str | None = Field(default=None, max_length=500)
    file_ids: list[str] | None = None


class PortfolioProjectUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(max_length=200)
    description: str | None = None
    skills_used: list[str] | None = None
    project_url: str | None = Field(default=None, max_length=500)
    file_ids: list[str] | None = None


class PortfolioProjectResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str | None
    skills_used: list[str] | None
    project_url: str | None
    file_ids: list[str] | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
