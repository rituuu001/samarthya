from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.submission import (
    SprintSubmission,
    SubmissionRevision,
    SubmissionRevisionStatus,
    SubmissionStatus,
)
from app.models.sprint import Sprint
from app.models.user import User, UserRole


def _require_user(db: Session, user_id: UUID, role: UserRole) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise LookupError("User not found")
    if user.role != role or not user.is_active:
        raise PermissionError(f"An active {role.value.lower()} account is required")
    return user


def _get_application(db: Session, application_id: UUID) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise LookupError("Application not found")
    return application


def _get_submission_context(
    db: Session,
    submission_id: UUID,
    lock: bool = False,
) -> tuple[SprintSubmission, Application, Sprint]:
    statement = select(SprintSubmission).where(SprintSubmission.id == submission_id)
    if lock:
        statement = statement.with_for_update()
    submission = db.scalar(statement)
    if submission is None:
        raise LookupError("Submission not found")

    application = _get_application(db, submission.application_id)
    sprint = db.get(Sprint, application.sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    return submission, application, sprint


def _require_employer_owns_sprint(
    db: Session,
    employer_id: UUID,
    sprint: Sprint,
) -> None:
    _require_user(db, employer_id, UserRole.EMPLOYER)
    if sprint.employer_id != employer_id:
        raise PermissionError("Only the Sprint's employer can review submissions")


def _commit_or_raise_conflict(
    db: Session,
    constraint_name: str,
    message: str,
) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        actual_constraint = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if actual_constraint == constraint_name:
            raise ValueError(message) from error
        raise


def create_submission(
    db: Session,
    application_id: UUID,
    applicant_id: UUID,
    description: str | None,
    file_ids: list[str] | None,
) -> SprintSubmission:
    _require_user(db, applicant_id, UserRole.CONTRIBUTOR)
    application = _get_application(db, application_id)
    if application.applicant_id != applicant_id:
        raise PermissionError("Contributors can only submit for their own application")
    if application.status != ApplicationStatus.SELECTED.value:
        raise ValueError("Only SELECTED applications can submit Sprint work")

    sprint = db.get(Sprint, application.sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    if (
        sprint.status != "PUBLISHED"
        or datetime.now(timezone.utc) >= sprint.deadline
    ):
        raise ValueError("Sprint is not in a valid state for submission")

    existing = db.scalar(
        select(SprintSubmission).where(
            SprintSubmission.application_id == application_id
        )
    )
    if existing is not None:
        raise ValueError("A submission already exists for this application")

    now = datetime.now(timezone.utc)
    submission = SprintSubmission(
        application_id=application_id,
        description=description,
        file_ids=file_ids,
        current_revision_number=0,
        status=SubmissionStatus.SUBMITTED.value,
        submitted_at=now,
    )
    db.add(submission)
    _commit_or_raise_conflict(
        db,
        "uq_sprint_submissions_application",
        "A submission already exists for this application",
    )
    db.refresh(submission)
    return submission


def get_submission_for_application(
    db: Session,
    application_id: UUID,
    actor_id: UUID,
) -> SprintSubmission:
    application = _get_application(db, application_id)
    submission = db.scalar(
        select(SprintSubmission).where(
            SprintSubmission.application_id == application_id
        )
    )
    if submission is None:
        raise LookupError("Submission not found")

    sprint = db.get(Sprint, application.sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    actor = db.get(User, actor_id)
    if actor is None:
        raise LookupError("User not found")
    is_applicant = (
        actor.id == application.applicant_id
        and actor.role == UserRole.CONTRIBUTOR
        and actor.is_active
    )
    is_employer = (
        actor.id == sprint.employer_id
        and actor.role == UserRole.EMPLOYER
        and actor.is_active
    )
    if not is_applicant and not is_employer:
        raise PermissionError("Only the applicant or Sprint employer can view the submission")
    return submission


def request_revision(
    db: Session,
    submission_id: UUID,
    employer_id: UUID,
    requested_changes: str | None,
) -> SubmissionRevision:
    submission, _, sprint = _get_submission_context(db, submission_id, lock=True)
    _require_employer_owns_sprint(db, employer_id, sprint)
    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise ValueError("Only SUBMITTED work can be sent for revision")
    if submission.current_revision_number >= sprint.revision_limit:
        raise ValueError("The Sprint revision limit has been reached")

    now = datetime.now(timezone.utc)
    revision = SubmissionRevision(
        submission_id=submission.id,
        revision_number=submission.current_revision_number + 1,
        requested_changes=requested_changes,
        status=SubmissionRevisionStatus.REVISION_REQUESTED.value,
        requested_at=now,
    )
    submission.current_revision_number = revision.revision_number
    submission.status = SubmissionStatus.REVISION_REQUESTED.value
    submission.reviewed_at = now
    db.add(revision)
    _commit_or_raise_conflict(
        db,
        "uq_submission_revisions_number",
        "A revision request already exists for this revision number",
    )
    db.refresh(revision)
    return revision


def resubmit_submission(
    db: Session,
    submission_id: UUID,
    applicant_id: UUID,
    description: str | None,
    file_ids: list[str] | None,
) -> SprintSubmission:
    submission, application, _ = _get_submission_context(
        db,
        submission_id,
        lock=True,
    )
    _require_user(db, applicant_id, UserRole.CONTRIBUTOR)
    if application.applicant_id != applicant_id:
        raise PermissionError("Contributors can only resubmit their own work")
    if application.status != ApplicationStatus.SELECTED.value:
        raise ValueError("Only SELECTED applications can resubmit Sprint work")
    if submission.status != SubmissionStatus.REVISION_REQUESTED.value:
        raise ValueError("Only work with a revision request can be resubmitted")

    revision = db.scalar(
        select(SubmissionRevision)
        .where(
            SubmissionRevision.submission_id == submission.id,
            SubmissionRevision.revision_number == submission.current_revision_number,
        )
        .with_for_update()
    )
    if (
        revision is None
        or revision.status != SubmissionRevisionStatus.REVISION_REQUESTED.value
    ):
        raise ValueError("No pending revision request was found")

    now = datetime.now(timezone.utc)
    revision.resubmission_description = description
    revision.file_ids = file_ids
    revision.resubmitted_at = now
    revision.status = SubmissionRevisionStatus.RESUBMITTED.value
    submission.description = description
    submission.file_ids = file_ids
    submission.submitted_at = now
    submission.current_revision_number = revision.revision_number
    submission.status = SubmissionStatus.SUBMITTED.value
    db.commit()
    db.refresh(submission)
    return submission


def approve_submission(
    db: Session,
    submission_id: UUID,
    employer_id: UUID,
) -> SprintSubmission:
    submission, _, sprint = _get_submission_context(db, submission_id, lock=True)
    _require_employer_owns_sprint(db, employer_id, sprint)
    if submission.status != SubmissionStatus.SUBMITTED.value:
        raise ValueError("Only SUBMITTED work can be approved")

    now = datetime.now(timezone.utc)
    submission.status = SubmissionStatus.APPROVED.value
    submission.reviewed_at = now
    submission.approved_at = now
    db.commit()
    db.refresh(submission)
    return submission
