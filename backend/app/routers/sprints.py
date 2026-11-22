from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.application import EmployerSprintApplicantCountsResponse
from app.schemas.sprint import PublishSprintRequest, SprintCreate, SprintResponse, MarketplaceSprintResponse
from app.services import application_service, sprint_service

from app.core.dependencies import get_optional_current_user

from app.core.permissions import require_roles
from app.models.user import User, UserRole

router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.post(
    "",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sprint(
    sprint_data: SprintCreate,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.create_sprint(db, sprint_data, current_user.id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except PermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post("/{sprint_id}/publish", response_model=SprintResponse)
def publish_sprint(
    sprint_id: UUID,
    payload: PublishSprintRequest,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.publish_sprint(
            db, sprint_id, current_user.id,
            payment_method=payload.payment_method,
            source_identifier=payload.source_identifier,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except PermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error)
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.get("", response_model=list[MarketplaceSprintResponse])
def browse_sprints(
    db: Session = Depends(get_db),
) -> list[MarketplaceSprintResponse]:
    return sprint_service.get_published_sprints(db)


@router.get("/mine", response_model=list[SprintResponse])
def get_my_sprints(
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> list[SprintResponse]:
    return sprint_service.get_employer_sprints(db, current_user.id)


@router.get(
    "/mine/applicant-counts",
    response_model=list[EmployerSprintApplicantCountsResponse],
)
def get_my_sprint_applicant_counts(
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> list[EmployerSprintApplicantCountsResponse]:
    try:
        return application_service.get_employer_sprint_applicant_counts(
            db,
            current_user.id,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except PermissionError as error:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(error),
        ) from error


@router.get("/{sprint_id}", response_model=SprintResponse)
def read_sprint(
    sprint_id: UUID,
    current_user: User | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.get_sprint_by_id(
            db,
            sprint_id,
            current_user,
        )
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error