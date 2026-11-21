from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=150)
    role: Literal["CONTRIBUTOR", "EMPLOYER"]

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in "!@#$%^&*()_+-=[]{};':\"\\|,.<>/?" for c in v)
        if not has_digit and not has_special:
            raise ValueError("Password must contain a number or special character")
        return v


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"