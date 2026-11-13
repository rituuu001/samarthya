from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class SprintCreate(BaseModel):
    title: str
    description: str
    skill: str
    difficulty: str
    payment_amount: Decimal
    deadline: datetime


class SprintResponse(BaseModel):
    id: int
    employer_id: int
    title: str
    description: str
    skill: str
    difficulty: str
    payment_amount: Decimal
    deadline: datetime
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
