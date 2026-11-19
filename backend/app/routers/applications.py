from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.anonymization import generate_contributor_code
from app.db.session import get_db
from app.schemas.application import (
    ApplicationResponse,
    EmployerApplicationResponse,
)
from app.schemas.shared_evidence import (
    SharedEvidenceResponse,
    SharedProofRecordResponse,
    SharedProjectResponse,
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


def _to_employer_response(
    applications: list, employer_id: UUID
) -> list[EmployerApplicationResponse]:
    return [
        EmployerApplicationResponse(
            id=app.id,
            sprint_id=app.sprint_id,
            status=app.status,
            applied_at=app.applied_at,
            updated_at=app.updated_at,
            contributor_code=generate_contributor_code(employer_id, app.applicant_id),
        )
        for app in applications
    ]


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
        applications = application_service.get_sprint_applications(
            db,
            sprint_id,
            current_user.id,
        )
        return _to_employer_response(applications, current_user.id)
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
        application = application_service.shortlist_application(
            db,
            application_id,
            current_user.id,
        )
        return EmployerApplicationResponse(
            id=application.id,
            sprint_id=application.sprint_id,
            status=application.status,
            applied_at=application.applied_at,
            updated_at=application.updated_at,
            contributor_code=generate_contributor_code(current_user.id, application.applicant_id),
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/applications/{application_id}/shared-evidence",
    response_model=SharedEvidenceResponse,
)
def get_shared_evidence(
    application_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> SharedEvidenceResponse:
    try:
        proof_records, projects = application_service.get_shared_evidence(
            db,
            application_id,
            current_user.id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)
    return SharedEvidenceResponse(
        proof_records=[
            SharedProofRecordResponse(
                title=record.title,
                description=record.description,
                skills_demonstrated=record.skills_demonstrated,
                verified_at=record.verified_at,
            )
            for record in proof_records
        ],
        projects=[
            SharedProjectResponse(
                title=project.title,
                description=project.description,
                skills_used=project.skills_used,
                project_url=project.project_url,
            )
            for project in projects
        ],
)

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
        application = application_service.select_application(
            db,
            application_id,
            current_user.id,
        )
        return EmployerApplicationResponse(
            id=application.id,
            sprint_id=application.sprint_id,
            status=application.status,
            applied_at=application.applied_at,
            updated_at=application.updated_at,
            contributor_code=generate_contributor_code(current_user.id, application.applicant_id),
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)
