from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


_ORGANIZATION_TYPES = (
    "Startup",
    "Company",
    "NGO / INGO",
    "Educational Institution",
    "Individual / Independent Employer",
    "Other",
)

_ORGANIZATION_SIZES = (
    "Solo",
    "2–10",
    "11–50",
    "51–200",
    "200+",
)

_PHONE_PATTERN = r"^\+?[1-9]\d{0,14}$"


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    bio: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=150)
    skills: list[str] | None = None
    education: list[dict[str, Any]] | None = None
    organization_name: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=500)
    position: str | None = Field(default=None, max_length=100)
    organization_type: str | None = Field(default=None, max_length=100)
    organization_size: str | None = Field(default=None, max_length=50)
    phone_number: str | None = Field(default=None, max_length=25)

    @field_validator("full_name")
    @classmethod
    
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Full name cannot be empty")

        return value.strip() if value is not None else value

    @field_validator("organization_type")
    @classmethod
    def validate_organization_type(cls, value: str | None) -> str | None:
        if value is not None and value not in _ORGANIZATION_TYPES:
            raise ValueError(
                "Invalid organization type. Must be one of: "
                + ", ".join(_ORGANIZATION_TYPES)
            )
        return value

    @field_validator("organization_size")
    @classmethod
    def validate_organization_size(cls, value: str | None) -> str | None:
        if value is not None and value not in _ORGANIZATION_SIZES:
            raise ValueError(
                "Invalid organization size. Must be one of: "
                + ", ".join(_ORGANIZATION_SIZES)
            )
        return value

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str | None) -> str | None:
        if value is not None:
            import re

            if not re.match(_PHONE_PATTERN, value.strip()):
                raise ValueError(
                    "Invalid phone number. Use international format, e.g. +9771234567890."
                )
            return value.strip()
        return value


class UserProfileResponse(BaseModel):
    id: str
    user_id: str
    full_name: str
    bio: str | None
    location: str | None
    skills: list[str] | None
    education: list[dict[str, Any]] | None
    organization_name: str | None
    website: str | None
    position: str | None
    organization_type: str | None
    organization_size: str | None
    phone_number: str | None
