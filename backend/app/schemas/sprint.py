from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


AssessmentCategory = Literal["Python", "Frontend", "Graphic Design"]


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
    status: str
    created_at: datetime | None
    updated_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
