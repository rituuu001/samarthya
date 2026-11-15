from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.models.assessment import (
    AssessmentAnswer,
    AssessmentAttempt,
    AssessmentQuestion,
    AssessmentTemplate,
    SprintAssessment,
    SprintAssessmentQuestion,
)
from app.models.application import ApplicationStatus
from app.models.sprint import Sprint
from app.schemas.assessment import AssignedAssessmentResponse
from app.schemas.sprint import SprintCreate
from app.services.assessment_service import (
    PASSING_PERCENTAGE,
    get_assigned_assessment,
    start_assessment,
    submit_assessment,
)
from app.services.sprint_service import create_sprint


class FakeSession:
    def __init__(
        self,
        *,
        scalar_results: list[object] | None = None,
        scalar_rows: list[object] | None = None,
        get_results: dict[UUID, object] | None = None,
    ) -> None:
        self.scalar_results = list(scalar_results or [])
        self.scalar_rows = list(scalar_rows or [])
        self.added: list[object] = []
        self.added_many: list[object] = []
        self.committed = 0
        self.rolled_back = 0
        self.refreshed: list[object] = []
        self.get_results = get_results or {}

    def scalar(self, statement: object) -> object | None:
        if not self.scalar_results:
            return None
        return self.scalar_results.pop(0)

    def get(self, model: type[object], object_id: UUID) -> object | None:
        return self.get_results.get(object_id)

    def scalars(self, statement: object) -> "FakeSession":
        order_by = getattr(statement, "_order_by_clauses", ())
        if order_by and self.scalar_rows and hasattr(self.scalar_rows[0], "position"):
            self.scalar_rows.sort(key=lambda row: row.position)
        return self

    def all(self) -> list[object]:
        return list(self.scalar_rows)

    def add(self, instance: object) -> None:
        self.added.append(instance)

    def add_all(self, instances: list[object]) -> None:
        self.added_many.extend(instances)

    def flush(self) -> None:
        for instance in [*self.added, *self.added_many]:
            if getattr(instance, "id", None) is None:
                instance.id = uuid4()

    def commit(self) -> None:
        self.committed += 1

    def rollback(self) -> None:
        self.rolled_back += 1

    def refresh(self, instance: object) -> None:
        self.refreshed.append(instance)


def _sprint_create() -> SprintCreate:
    return SprintCreate(
        title="Python Sprint",
        description="Build a small Python feature.",
        skill_category="Python",
        difficulty="Beginner",
        task_type="GENERAL",
        budget=Decimal("100"),
        currency="USD",
        number_of_positions=1,
        revision_limit=0,
        deadline=datetime.now(timezone.utc) + timedelta(days=2),
        application_deadline=datetime.now(timezone.utc) + timedelta(days=1),
    )


def _template() -> AssessmentTemplate:
    template = AssessmentTemplate(
        skill="Python",
        difficulty="Beginner",
        title="Python Foundations",
        description="A beginner Python assessment.",
        version=3,
        duration_minutes=30,
        is_active=True,
    )
    template.id = uuid4()
    return template


def _question(
    position: int,
    *,
    prompt: str | None = None,
    answer: str | None = None,
) -> AssessmentQuestion:
    question = AssessmentQuestion(
        template_id=uuid4(),
        question_type="SHORT_ANSWER",
        prompt=prompt or f"Question {position}",
        instructions=None,
        position=position,
        points=Decimal("1"),
        candidate_config={"hint": "Read the prompt."},
        grading_config={"accepted_answers": [answer or f"answer {position}"]},
        is_active=True,
    )
    question.id = uuid4()
    return question


def _attempt(
    *,
    expires_at: datetime,
    sprint_deadline: datetime,
    attempt_id: UUID | None = None,
) -> AssessmentAttempt:
    attempt = AssessmentAttempt(
        application_id=uuid4(),
        sprint_assessment_id=uuid4(),
        status="IN_PROGRESS",
        started_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        expires_at=expires_at,
    )
    attempt.id = attempt_id or uuid4()
    attempt.sprint_assessment = SimpleNamespace(
        id=attempt.sprint_assessment_id,
        sprint_id=uuid4(),
        sprint=SimpleNamespace(deadline=sprint_deadline),
    )
    return attempt


def _application(
    *,
    application_id: UUID,
    applicant_id: UUID,
    sprint_id: UUID,
    status: str = ApplicationStatus.APPLIED.value,
) -> SimpleNamespace:
    return SimpleNamespace(
        id=application_id,
        applicant_id=applicant_id,
        sprint_id=sprint_id,
        status=status,
    )


def test_sprint_creation_assigns_matching_template_and_ordered_isolated_snapshots() -> None:
    template = _template()
    questions = [
        _question(2, answer="second"),
        _question(1, answer="first"),
    ]
    db = FakeSession(scalar_results=[template], scalar_rows=questions)

    sprint = create_sprint(db, _sprint_create(), uuid4())

    assert db.committed == 1
    assert db.rolled_back == 0
    assert len(db.added) == 2
    assignment = next(item for item in db.added if isinstance(item, SprintAssessment))
    snapshots = db.added_many

    assert assignment.sprint_id == sprint.id
    assert assignment.template_id == template.id
    assert assignment.template_version == template.version
    assert assignment.duration_minutes == 30
    assert [snapshot.position for snapshot in snapshots] == [1, 2]
    assert [snapshot.prompt for snapshot in snapshots] == ["Question 1", "Question 2"]
    assert snapshots[0].grading_config == {"accepted_answers": ["first"]}

    questions[1].prompt = "Edited later"
    questions[1].grading_config["accepted_answers"][0] = "changed"
    assert snapshots[0].prompt == "Question 1"
    assert snapshots[0].grading_config == {"accepted_answers": ["first"]}


def test_sprint_creation_rolls_back_when_no_matching_template_exists() -> None:
    db = FakeSession(scalar_results=[None])

    with pytest.raises(LookupError, match="No active assessment template"):
        create_sprint(db, _sprint_create(), uuid4())

    assert db.committed == 0
    assert db.rolled_back == 1


def test_assigned_assessment_response_excludes_grading_configuration() -> None:
    assignment = SimpleNamespace(
        id=uuid4(),
        sprint_id=uuid4(),
        title="Python Foundations",
        description="Assessment description",
        duration_minutes=30,
        sprint=SimpleNamespace(
            id=None,
            status="PUBLISHED",
            deadline=datetime.now(timezone.utc) + timedelta(days=1),
        ),
    )
    assignment.sprint.id = assignment.sprint_id
    application_id = uuid4()
    applicant_id = uuid4()
    application = _application(
        application_id=application_id,
        applicant_id=applicant_id,
        sprint_id=assignment.sprint_id,
    )
    questions = [
        SprintAssessmentQuestion(
            id=uuid4(),
            question_type="MCQ",
            prompt="Choose the correct option.",
            instructions=None,
            position=1,
            points=Decimal("1"),
            candidate_config={
                "choices": [{"id": "a", "text": "Visible", "is_correct": True}],
                "test_cases": [{"expected": "secret"}],
            },
            grading_config={"accepted_answers": ["a"]},
        )
    ]
    db = FakeSession(
        scalar_results=[assignment],
        scalar_rows=questions,
        get_results={application_id: application},
    )

    result = get_assigned_assessment(
        db,
        assignment.id,
        application_id,
        applicant_id,
    )
    serialized = AssignedAssessmentResponse.model_validate(result).model_dump_json()

    assert "grading_config" not in serialized
    assert "accepted_answers" not in serialized
    assert "is_correct" not in serialized
    assert "test_cases" not in serialized
    assert "expected" not in serialized
    assert "Visible" in serialized


def test_attempt_is_unique_per_application_and_active_retry_is_idempotent() -> None:
    now = datetime.now(timezone.utc)
    assignment = SimpleNamespace(
        id=uuid4(),
        duration_minutes=30,
        sprint_id=uuid4(),
        sprint=SimpleNamespace(
            id=None,
            status="PUBLISHED",
            deadline=now + timedelta(hours=1),
        ),
    )
    assignment.sprint.id = assignment.sprint_id
    existing = _attempt(
        expires_at=now + timedelta(minutes=29),
        sprint_deadline=now + timedelta(hours=1),
    )
    existing.sprint_assessment_id = assignment.id
    applicant_id = uuid4()
    application = _application(
        application_id=existing.application_id,
        applicant_id=applicant_id,
        sprint_id=assignment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[assignment, existing],
        get_results={existing.application_id: application},
    )

    result = start_assessment(
        db,
        existing.application_id,
        assignment.id,
        applicant_id,
    )

    assert result is existing
    assert db.committed == 0
    assert db.added == []
    assert any(
        constraint.name == "uq_assessment_attempts_application"
        for constraint in AssessmentAttempt.__table__.constraints
    )


def test_starting_attempt_sets_fixed_thirty_minute_expiry() -> None:
    now = datetime.now(timezone.utc)
    sprint_deadline = now + timedelta(hours=2)
    assignment = SimpleNamespace(
        id=uuid4(),
        duration_minutes=30,
        sprint_id=uuid4(),
        sprint=SimpleNamespace(
            id=None,
            status="PUBLISHED",
            deadline=sprint_deadline,
        ),
    )
    assignment.sprint.id = assignment.sprint_id
    application_id = uuid4()
    applicant_id = uuid4()
    application = _application(
        application_id=application_id,
        applicant_id=applicant_id,
        sprint_id=assignment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[assignment, None],
        get_results={application_id: application},
    )

    attempt = start_assessment(
        db,
        application_id,
        assignment.id,
        applicant_id,
    )

    assert attempt.expires_at - attempt.started_at == timedelta(minutes=30)
    assert attempt.expires_at < sprint_deadline
    assert db.committed == 1


def test_starting_attempt_rejects_existing_submitted_attempt() -> None:
    now = datetime.now(timezone.utc)
    assignment = SimpleNamespace(
        id=uuid4(),
        duration_minutes=30,
        sprint_id=uuid4(),
        sprint=SimpleNamespace(
            id=None,
            status="PUBLISHED",
            deadline=now + timedelta(hours=1),
        ),
    )
    assignment.sprint.id = assignment.sprint_id
    existing = _attempt(
        expires_at=now + timedelta(minutes=5),
        sprint_deadline=now + timedelta(hours=1),
    )
    existing.status = "SUBMITTED"
    applicant_id = uuid4()
    application = _application(
        application_id=existing.application_id,
        applicant_id=applicant_id,
        sprint_id=assignment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[assignment, existing],
        get_results={existing.application_id: application},
    )

    with pytest.raises(ValueError, match="already exists"):
        start_assessment(
            db,
            existing.application_id,
            assignment.id,
            applicant_id,
        )


def test_applicant_cannot_start_another_users_application() -> None:
    now = datetime.now(timezone.utc)
    sprint_id = uuid4()
    assignment = SimpleNamespace(
        id=uuid4(),
        duration_minutes=30,
        sprint_id=sprint_id,
        sprint=SimpleNamespace(
            id=sprint_id,
            status="PUBLISHED",
            deadline=now + timedelta(hours=1),
        ),
    )
    application_id = uuid4()
    application = _application(
        application_id=application_id,
        applicant_id=uuid4(),
        sprint_id=sprint_id,
    )
    db = FakeSession(
        scalar_results=[assignment],
        get_results={application_id: application},
    )

    with pytest.raises(PermissionError, match="own application"):
        start_assessment(db, application_id, assignment.id, uuid4())

    assert db.committed == 0


def test_applicant_cannot_submit_another_users_attempt() -> None:
    now = datetime.now(timezone.utc)
    attempt = _attempt(
        expires_at=now + timedelta(minutes=20),
        sprint_deadline=now + timedelta(days=1),
    )
    application = _application(
        application_id=attempt.application_id,
        applicant_id=uuid4(),
        sprint_id=attempt.sprint_assessment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[attempt],
        get_results={attempt.application_id: application},
    )

    with pytest.raises(PermissionError, match="own assessment"):
        submit_assessment(db, attempt.id, [], uuid4())

    assert db.committed == 0


def test_submit_scores_answers_and_passes_at_exactly_fifty_percent() -> None:
    now = datetime.now(timezone.utc)
    first, second = uuid4(), uuid4()
    sprint_deadline = now + timedelta(days=1)
    attempt = _attempt(
        expires_at=now + timedelta(minutes=29),
        sprint_deadline=sprint_deadline,
    )
    applicant_id = uuid4()
    application = _application(
        application_id=attempt.application_id,
        applicant_id=applicant_id,
        sprint_id=attempt.sprint_assessment.sprint_id,
    )
    questions = [
        SprintAssessmentQuestion(
            id=first,
            question_type="SHORT_ANSWER",
            position=1,
            points=Decimal("1"),
            grading_config={"accepted_answers": ["Correct"]},
        ),
        SprintAssessmentQuestion(
            id=second,
            question_type="SHORT_ANSWER",
            position=2,
            points=Decimal("1"),
            grading_config={"accepted_answers": ["Also correct"]},
        ),
    ]
    db = FakeSession(
        scalar_results=[attempt],
        scalar_rows=questions,
        get_results={attempt.application_id: application},
    )

    result = submit_assessment(
        db,
        attempt.id,
        [(first, " correct ")],
        applicant_id,
    )

    assert PASSING_PERCENTAGE == Decimal("50")
    assert result["score"] == Decimal("1")
    assert result["max_score"] == Decimal("2")
    assert result["percentage"] == Decimal("50")
    assert result["passed"] is True
    assert attempt.status == "SUBMITTED"
    assert application.status == ApplicationStatus.ASSESSMENT_SUBMITTED.value
    assert len(db.added_many) == 2
    assert all(isinstance(answer, AssessmentAnswer) for answer in db.added_many)


def test_submission_after_attempt_expiry_marks_attempt_expired() -> None:
    now = datetime.now(timezone.utc)
    attempt = _attempt(
        expires_at=now - timedelta(seconds=1),
        sprint_deadline=now + timedelta(days=1),
    )
    applicant_id = uuid4()
    application = _application(
        application_id=attempt.application_id,
        applicant_id=applicant_id,
        sprint_id=attempt.sprint_assessment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[attempt],
        get_results={attempt.application_id: application},
    )

    with pytest.raises(ValueError, match="time limit has expired"):
        submit_assessment(db, attempt.id, [], applicant_id)

    assert attempt.status == "EXPIRED"
    assert db.committed == 1


def test_submission_after_sprint_deadline_is_rejected_and_expires_attempt() -> None:
    now = datetime.now(timezone.utc)
    attempt = _attempt(
        expires_at=now + timedelta(minutes=20),
        sprint_deadline=now - timedelta(seconds=1),
    )
    applicant_id = uuid4()
    application = _application(
        application_id=attempt.application_id,
        applicant_id=applicant_id,
        sprint_id=attempt.sprint_assessment.sprint_id,
    )
    db = FakeSession(
        scalar_results=[attempt],
        get_results={attempt.application_id: application},
    )

    with pytest.raises(ValueError, match="time limit has expired"):
        submit_assessment(db, attempt.id, [], applicant_id)

    assert attempt.status == "EXPIRED"
    assert db.committed == 1
