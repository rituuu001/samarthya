from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.application import (
    ApplicationResponse,
    EmployerApplicationResponse,
)
from app.services import application_service
from app.core.permissions import require_roles
from app.models.user import User, UserRole

router = APIRouter(tags=["applications"])


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
    "/sprints/{sprint_id}/applications",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
)
def apply_to_sprint(
    sprint_id: UUID,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    try:
        return application_service.apply_to_sprint(db, sprint_id, current_user.id)
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/applications",
    response_model=list[ApplicationResponse],
)
def get_applicant_applications(
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> list[ApplicationResponse]:
    try:
        return application_service.get_applicant_applications(db, current_user.id)
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/sprints/{sprint_id}/applications",
    response_model=list[EmployerApplicationResponse],
)
def get_sprint_applications(
    sprint_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> list[EmployerApplicationResponse]:
    try:
        return application_service.get_sprint_applications(
            db,
            sprint_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/applications/{application_id}/shortlist",
    response_model=EmployerApplicationResponse,
)
def shortlist_application(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> EmployerApplicationResponse:
    try:
        return application_service.shortlist_application(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/applications/{application_id}/select",
    response_model=EmployerApplicationResponse,
)
def select_application(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> EmployerApplicationResponse:
    try:
        return application_service.select_application(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)
