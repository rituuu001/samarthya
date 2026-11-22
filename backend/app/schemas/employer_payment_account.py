from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


EmployerPaymentAccountType = Literal["esewa", "khalti", "bank"]


class EmployerPaymentAccountCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_type: EmployerPaymentAccountType
    account_identifier: str = Field(min_length=1, max_length=255)
    is_default: bool = False


class EmployerPaymentAccountUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_type: EmployerPaymentAccountType | None = None
    account_identifier: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    is_default: bool | None = None

    @model_validator(mode="after")
    def validate_patch(self) -> "EmployerPaymentAccountUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one payment-account field must be provided")
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Payment-account fields cannot be null")
        return self


class EmployerPaymentAccountResponse(BaseModel):
    id: UUID
    account_type: EmployerPaymentAccountType
    account_identifier: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
