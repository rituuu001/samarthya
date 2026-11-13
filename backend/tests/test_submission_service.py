import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.submission import (
    SprintSubmission,
    SubmissionRevision,
    SubmissionRevisionStatus,
    SubmissionStatus,
)
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.services.submission_service import (
    approve_submission,
    create_submission,
    request_revision,
    resubmit_submission,
)


@pytest.fixture
def scenario():
    db = SessionLocal()
    employer_id = uuid.uuid4()
    other_employer_id = uuid.uuid4()
    applicant_id = uuid.uuid4()
    other_applicant_id = uuid.uuid4()
    sprint_id = uuid.uuid4()
    selected_application_id = uuid.uuid4()
    other_application_id = uuid.uuid4()

    users = [
        User(
            id=employer_id,
            email=f"{employer_id}@test.invalid",
            password_hash="test",
            role=UserRole.EMPLOYER,
        ),
        User(
            id=other_employer_id,
            email=f"{other_employer_id}@test.invalid",
            password_hash="test",
            role=UserRole.EMPLOYER,
        ),
        User(
            id=applicant_id,
            email=f"{applicant_id}@test.invalid",
            password_hash="test",
            role=UserRole.CONTRIBUTOR,
        ),
        User(
            id=other_applicant_id,
            email=f"{other_applicant_id}@test.invalid",
            password_hash="test",
            role=UserRole.CONTRIBUTOR,
        ),
    ]
    sprint = Sprint(
        id=sprint_id,
        employer_id=employer_id,
        title="Submission service test",
        description="Temporary test Sprint",
        skill_category="Python",
        difficulty="Beginner",
        task_type="Test",
        budget=10,
        currency="USD",
        number_of_positions=1,
        revision_limit=1,
        deadline=datetime.now(timezone.utc) + timedelta(days=2),
        application_deadline=datetime.now(timezone.utc) + timedelta(days=1),
        status="PUBLISHED",
    )
    selected_application = Application(
        id=selected_application_id,
        sprint_id=sprint_id,
        applicant_id=applicant_id,
        status=ApplicationStatus.SELECTED.value,
    )
    other_application = Application(
        id=other_application_id,
        sprint_id=sprint_id,
        applicant_id=other_applicant_id,
        status=ApplicationStatus.APPLIED.value,
    )

    try:
        db.add_all(users)
        db.commit()
        db.add(sprint)
        db.commit()
        db.add_all([selected_application, other_application])
        db.commit()

        yield SimpleNamespace(
            db=db,
            employer_id=employer_id,
            other_employer_id=other_employer_id,
            applicant_id=applicant_id,
            other_applicant_id=other_applicant_id,
            sprint_id=sprint_id,
            selected_application_id=selected_application_id,
            other_application_id=other_application_id,
        )
    finally:
        db.rollback()
        application_ids = [selected_application_id, other_application_id]
        submission_ids = select(SprintSubmission.id).where(
            SprintSubmission.application_id.in_(application_ids)
        )
        db.execute(
            delete(SubmissionRevision).where(
                SubmissionRevision.submission_id.in_(submission_ids)
            )
        )
        db.execute(
            delete(SprintSubmission).where(
                SprintSubmission.application_id.in_(application_ids)
            )
        )
        db.execute(delete(Application).where(Application.id.in_(application_ids)))
        db.execute(delete(Sprint).where(Sprint.id == sprint_id))
        db.execute(delete(User).where(User.id.in_([
            employer_id,
            other_employer_id,
            applicant_id,
            other_applicant_id,
        ])))
        db.commit()
        db.close()


def _create_submission(scenario) -> SprintSubmission:
    return create_submission(
        scenario.db,
        scenario.selected_application_id,
        scenario.applicant_id,
        "Initial delivery",
        ["file-1"],
    )


def test_selected_contributor_creates_initial_submission_without_revision(scenario):
    submission = _create_submission(scenario)

    assert submission.status == SubmissionStatus.SUBMITTED.value
    assert submission.current_revision_number == 0
    assert submission.submitted_at is not None
    assert submission.description == "Initial delivery"
    assert submission.file_ids == ["file-1"]
    assert scenario.db.scalar(
        select(SubmissionRevision).where(
            SubmissionRevision.submission_id == submission.id
        )
    ) is None


def test_non_selected_application_cannot_submit(scenario):
    with pytest.raises(ValueError, match="SELECTED"):
        create_submission(
            scenario.db,
            scenario.other_application_id,
            scenario.other_applicant_id,
            "Initial delivery",
            None,
        )


def test_duplicate_initial_submission_is_rejected_by_service_and_database(scenario):
    submission = _create_submission(scenario)

    with pytest.raises(ValueError, match="already exists"):
        _create_submission(scenario)

    duplicate = SprintSubmission(
        application_id=scenario.selected_application_id,
        description="Duplicate",
        current_revision_number=0,
        status=SubmissionStatus.SUBMITTED.value,
    )
    scenario.db.add(duplicate)
    with pytest.raises(IntegrityError):
        scenario.db.commit()
    scenario.db.rollback()
    assert scenario.db.get(SprintSubmission, submission.id) is not None


def test_only_sprint_employer_can_request_revision(scenario):
    submission = _create_submission(scenario)

    with pytest.raises(PermissionError, match="Sprint's employer"):
        request_revision(
            scenario.db,
            submission.id,
            scenario.other_employer_id,
            "Please revise",
        )


def test_revision_request_requires_selected_application(scenario):
    submission = _create_submission(scenario)
    application = scenario.db.get(Application, scenario.selected_application_id)
    application.status = ApplicationStatus.SHORTLISTED.value
    scenario.db.commit()

    with pytest.raises(ValueError, match="SELECTED"):
        request_revision(
            scenario.db,
            submission.id,
            scenario.employer_id,
            "Please revise",
        )


def test_revision_request_resubmission_limit_and_approval_workflow(scenario):
    submission = _create_submission(scenario)
    revision = request_revision(
        scenario.db,
        submission.id,
        scenario.employer_id,
        "Add tests",
    )

    assert revision.revision_number == 1
    assert revision.status == SubmissionRevisionStatus.REVISION_REQUESTED.value
    assert submission.current_revision_number == 1
    assert submission.status == SubmissionStatus.REVISION_REQUESTED.value

    with pytest.raises(PermissionError, match="own work"):
        resubmit_submission(
            scenario.db,
            submission.id,
            scenario.other_applicant_id,
            "Unauthorized resubmission",
            None,
        )

    resubmitted = resubmit_submission(
        scenario.db,
        submission.id,
        scenario.applicant_id,
        "Updated delivery",
        ["file-2"],
    )
    assert resubmitted.status == SubmissionStatus.SUBMITTED.value
    assert resubmitted.current_revision_number == 1
    assert resubmitted.description == "Updated delivery"
    assert resubmitted.file_ids == ["file-2"]
    assert revision.status == SubmissionRevisionStatus.RESUBMITTED.value
    assert revision.resubmission_description == "Updated delivery"
    assert revision.file_ids == ["file-2"]
    assert revision.resubmitted_at is not None

    with pytest.raises(ValueError, match="revision limit"):
        request_revision(
            scenario.db,
            submission.id,
            scenario.employer_id,
            "One more revision",
        )

    approved = approve_submission(
        scenario.db,
        submission.id,
        scenario.employer_id,
    )
    assert approved.status == SubmissionStatus.APPROVED.value
    assert approved.approved_at is not None
    assert approved.reviewed_at is not None

    with pytest.raises(ValueError, match="SUBMITTED"):
        request_revision(
            scenario.db,
            submission.id,
            scenario.employer_id,
            "Cannot revise after approval",
        )
    with pytest.raises(ValueError, match="revision request"):
        resubmit_submission(
            scenario.db,
            submission.id,
            scenario.applicant_id,
            "Cannot resubmit after approval",
            None,
        )
