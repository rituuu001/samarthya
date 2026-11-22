from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.connection_request import (
    ConnectionRequestIdentityResponse,
    ConnectionRequestResponse,
)
from app.services import connection_request_service


router = APIRouter(tags=["connection-requests"])


def _raise_http_error(error: Exception) -> NoReturn:
    if isinstance(error, LookupError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    if isinstance(error, PermissionError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    if isinstance(error, ValueError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    raise error


@router.post(
    "/applications/{application_id}/connection-request",
    response_model=ConnectionRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_connection_request(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> ConnectionRequestResponse:
    try:
        return connection_request_service.create_connection_request(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/applications/{application_id}/connection-request",
    response_model=ConnectionRequestResponse,
)
def get_connection_request(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> ConnectionRequestResponse:
    try:
        return connection_request_service.get_connection_request_for_employer(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/sprints/{sprint_id}/connection-requests",
    response_model=list[ConnectionRequestResponse],
)
def list_sprint_connection_requests(
    sprint_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> list[ConnectionRequestResponse]:
    try:
        return connection_request_service.list_connection_requests_for_sprint(
            db,
            sprint_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/connection-requests",
    response_model=list[ConnectionRequestResponse],
)
def list_connection_requests(
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> list[ConnectionRequestResponse]:
    try:
        return connection_request_service.list_connection_requests_for_contributor(
            db,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/connection-requests/{request_id}/accept",
    response_model=ConnectionRequestResponse,
)
def accept_connection_request(
    request_id: UUID,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> ConnectionRequestResponse:
    try:
        return connection_request_service.respond_to_connection_request(
            db,
            request_id,
            current_user.id,
            accept=True,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/connection-requests/{request_id}/reject",
    response_model=ConnectionRequestResponse,
)
def reject_connection_request(
    request_id: UUID,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> ConnectionRequestResponse:
    try:
        return connection_request_service.respond_to_connection_request(
            db,
            request_id,
            current_user.id,
            accept=False,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/applications/{application_id}/connection-request/identity",
    response_model=ConnectionRequestIdentityResponse,
)
def get_connection_request_identity(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> ConnectionRequestIdentityResponse:
    try:
        return connection_request_service.get_revealed_identity(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)
