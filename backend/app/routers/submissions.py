from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.submission import (
    RevisionRequest,
    SubmissionCreate,
    SubmissionResponse,
    SubmissionResubmit,
    SubmissionRevisionResponse,
)
from app.services import submission_service


router = APIRouter(tags=["submissions"])


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
    "/applications/{application_id}/submission",
    response_model=SubmissionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_submission(
    application_id: UUID,
    # TODO: Replace this temporary actor ID with the authenticated user's ID.
    applicant_id: UUID,
    submission_data: SubmissionCreate,
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    try:
        return submission_service.create_submission(
            db,
            application_id,
            applicant_id,
            submission_data.description,
            submission_data.file_ids,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.get(
    "/applications/{application_id}/submission",
    response_model=SubmissionResponse,
)
def get_submission(
    application_id: UUID,
    # TODO: Replace this temporary actor ID with the authenticated user's ID.
    actor_id: UUID,
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    try:
        return submission_service.get_submission_for_application(
            db,
            application_id,
            actor_id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/submissions/{submission_id}/revision-requests",
    response_model=SubmissionRevisionResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_revision(
    submission_id: UUID,
    # TODO: Replace this temporary actor ID with the authenticated user's ID.
    employer_id: UUID,
    revision_data: RevisionRequest,
    db: Session = Depends(get_db),
) -> SubmissionRevisionResponse:
    try:
        return submission_service.request_revision(
            db,
            submission_id,
            employer_id,
            revision_data.requested_changes,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/submissions/{submission_id}/resubmissions",
    response_model=SubmissionResponse,
)
def resubmit_submission(
    submission_id: UUID,
    # TODO: Replace this temporary actor ID with the authenticated user's ID.
    applicant_id: UUID,
    resubmission_data: SubmissionResubmit,
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    try:
        return submission_service.resubmit_submission(
            db,
            submission_id,
            applicant_id,
            resubmission_data.description,
            resubmission_data.file_ids,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)


@router.post(
    "/submissions/{submission_id}/approve",
    response_model=SubmissionResponse,
)
def approve_submission(
    submission_id: UUID,
    # TODO: Replace this temporary actor ID with the authenticated user's ID.
    employer_id: UUID,
    db: Session = Depends(get_db),
) -> SubmissionResponse:
    try:
        return submission_service.approve_submission(
            db,
            submission_id,
            employer_id,
        )
    except (LookupError, PermissionError, ValueError) as error:
        _raise_http_error(error)
