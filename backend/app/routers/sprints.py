from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.sprint import SprintCreate, SprintResponse
from app.services import sprint_service


router = APIRouter(prefix="/sprints", tags=["sprints"])


@router.post(
    "",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sprint(
    sprint_data: SprintCreate,
    # TODO: Replace this temporary query parameter with the authenticated user's ID.
    employer_id: UUID,
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.create_sprint(db, sprint_data, employer_id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post("/{sprint_id}/publish", response_model=SprintResponse)
def publish_sprint(
    sprint_id: UUID,
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.publish_sprint(db, sprint_id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.get("", response_model=list[SprintResponse])
def browse_sprints(db: Session = Depends(get_db)) -> list[SprintResponse]:
    return sprint_service.get_published_sprints(db)


@router.get("/{sprint_id}", response_model=SprintResponse)
def read_sprint(
    sprint_id: UUID,
    db: Session = Depends(get_db),
) -> SprintResponse:
    try:
        return sprint_service.get_sprint_by_id(db, sprint_id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
