from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    bio: str | None = Field(default=None, max_length=1000)
    location: str | None = Field(default=None, max_length=150)
    skills: list[str] | None = None
    education: list[dict[str, Any]] | None = None
    organization_name: str | None = Field(default=None, max_length=200)
    website: str | None = Field(default=None, max_length=500)

    @field_validator("full_name")
    @classmethod
    
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("Full name cannot be empty")

        return value.strip() if value is not None else value     


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
