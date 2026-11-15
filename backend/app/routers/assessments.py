from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.assessment import (
    AssessmentAttemptResponse,
    AssessmentResultResponse,
    AssessmentSubmission,
    AssignedAssessmentResponse,
    EmployerAssessmentResultResponse,
)
from app.services import assessment_service


router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get(
    "/sprints/{sprint_id}/results",
    response_model=list[EmployerAssessmentResultResponse],
)
def get_sprint_assessment_results(
    sprint_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
) -> list[EmployerAssessmentResultResponse]:
    try:
        return assessment_service.get_sprint_assessment_results(
            db,
            sprint_id,
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


@router.get(
    "/sprint-assessments/{sprint_assessment_id}/applications/{application_id}",
    response_model=AssignedAssessmentResponse,
)
def view_assigned_assessment(
    sprint_assessment_id: UUID,
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
) -> AssignedAssessmentResponse:
    try:
        return assessment_service.get_assigned_assessment(
            db,
            sprint_assessment_id,
            application_id,
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
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post(
    "/sprint-assessments/{sprint_assessment_id}/applications/{application_id}/start",
    response_model=AssessmentAttemptResponse,
)
def start_assessment(
    sprint_assessment_id: UUID,
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
) -> AssessmentAttemptResponse:
    try:
        return assessment_service.start_assessment(
            db,
            application_id,
            sprint_assessment_id,
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
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error


@router.post(
    "/attempts/{attempt_id}/submit",
    response_model=AssessmentResultResponse,
)
def submit_assessment(
    attempt_id: UUID,
    submission: AssessmentSubmission,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
) -> AssessmentResultResponse:
    try:
        return assessment_service.submit_assessment(
            db,
            attempt_id,
            [(answer.question_id, answer.response) for answer in submission.answers],
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
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
