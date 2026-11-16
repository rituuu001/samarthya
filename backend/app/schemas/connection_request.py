from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.models.connection_request import ConnectionRequestStatus


class ConnectionRequestResponse(BaseModel):
    id: UUID
    application_id: UUID
    status: ConnectionRequestStatus
    created_at: datetime
    updated_at: datetime
    responded_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class ContributorIdentityResponse(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    profile_picture_id: UUID | None


class ConnectionRequestIdentityResponse(BaseModel):
    connection_request: ConnectionRequestResponse
    contributor: ContributorIdentityResponse
