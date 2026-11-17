import os
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "assessment-results-test-secret-key")

from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.sprint import Sprint
from app.models.user import UserRole

_DEFAULT_SUBMITTED_AT = object()


class FakeResult:
    def __init__(self, rows: list[tuple[object, object]]) -> None:
        self.rows = rows

    def all(self) -> list[tuple[object, object]]:
        return self.rows


class FakeSession:
    def __init__(
        self,
        *,
        sprint: object | None,
        rows: list[tuple[object, object]] | None = None,
    ) -> None:
        self.sprint = sprint
        self.rows = rows or []
        self.executed = False
        self.statement = None

    def get(self, model: type[object], object_id: object) -> object | None:
        assert model is Sprint
        if self.sprint is not None and self.sprint.id == object_id:
            return self.sprint
        return None

    def execute(self, statement: object) -> FakeResult:
        self.executed = True
        self.statement = statement
        sql = str(statement)
        for condition in (
            "applications.sprint_id =",
            "sprint_assessments.sprint_id =",
            "assessment_attempts.status =",
            "assessment_attempts.submitted_at IS NOT NULL",
            "assessment_attempts.score IS NOT NULL",
            "assessment_attempts.max_score IS NOT NULL",
            "assessment_attempts.max_score >",
        ):
            assert condition in sql
        compiled = statement.compile()
        parameters = compiled.params.values()
        assert "SUBMITTED" in parameters
        assert any(value == 0 for value in parameters)
        assert Decimal("100") in parameters
        order_by = statement._order_by_clauses
        assert len(order_by) == 2
        score_order = str(order_by[0])
        assert "assessment_attempts.score" in score_order
        assert "assessment_attempts.max_score" in score_order
        assert "DESC" in score_order
        assert str(order_by[1]) == "assessment_attempts.submitted_at ASC"

        rows = [
            (application, attempt)
            for application, attempt in self.rows
            if application.sprint_id == self.sprint.id
            and attempt.assessment_sprint_id == self.sprint.id
            and attempt.application_id == application.id
            and attempt.status == "SUBMITTED"
            and attempt.submitted_at is not None
            and attempt.score is not None
            and attempt.max_score is not None
            and Decimal(attempt.max_score) > 0
        ]
        rows.sort(
            key=lambda row: (
                -(
                    Decimal(row[1].score)
                    * Decimal("100")
                    / Decimal(row[1].max_score)
                ),
                row[1].submitted_at,
            )
        )
        return FakeResult(rows)


def _client_request(
    db: FakeSession,
    user: SimpleNamespace,
    sprint_id: object,
):
    previous_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            return client.get(f"/assessments/sprints/{sprint_id}/results")
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def _sprint(sprint_id: object, employer_id: object) -> SimpleNamespace:
    return SimpleNamespace(id=sprint_id, employer_id=employer_id)


def _user(user_id: object, role: UserRole) -> SimpleNamespace:
    return SimpleNamespace(id=user_id, role=role)


def _attempt_row(
    *,
    sprint_id: object,
    applicant_id: object,
    score: Decimal | None = Decimal("8"),
    max_score: Decimal | None = Decimal("10"),
    status: str = "SUBMITTED",
    submitted_at: datetime | None | object = _DEFAULT_SUBMITTED_AT,
    application_sprint_id: object | None = None,
    assessment_sprint_id: object | None = None,
) -> tuple[SimpleNamespace, SimpleNamespace]:
    if submitted_at is _DEFAULT_SUBMITTED_AT:
        submitted_at = datetime.now(timezone.utc)
    application = SimpleNamespace(
        id=uuid4(),
        applicant_id=applicant_id,
        sprint_id=application_sprint_id or sprint_id,
        applied_at=datetime.now(timezone.utc),
    )
    attempt = SimpleNamespace(
        application_id=application.id,
        assessment_sprint_id=assessment_sprint_id or sprint_id,
        status=status,
        score=score,
        max_score=max_score,
        submitted_at=submitted_at,
    )
    return application, attempt


def test_employer_can_retrieve_results_for_their_sprint() -> None:
    sprint_id, employer_id, applicant_id = uuid4(), uuid4(), uuid4()
    db = FakeSession(
        sprint=_sprint(sprint_id, employer_id),
        rows=[_attempt_row(sprint_id=sprint_id, applicant_id=applicant_id)],
    )

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 200
    result = response.json()[0]
    assert result["application_id"]
    assert "applicant_id" not in result
    assert "applicant_name" not in result
    assert result["attempt_status"] == "SUBMITTED"
    assert result["score"] == "8"
    assert result["max_score"] == "10"
    assert result["percentage"] == "80"
    assert result["passed"] is True
    assert result["submitted_at"]
    assert db.executed


def test_contributor_cannot_access_employer_results_endpoint() -> None:
    sprint_id, contributor_id = uuid4(), uuid4()
    db = FakeSession(sprint=None)

    response = _client_request(
        db,
        _user(contributor_id, UserRole.CONTRIBUTOR),
        sprint_id,
    )

    assert response.status_code == 403
    assert not db.executed


def test_employer_cannot_access_another_employers_results() -> None:
    sprint_id, owner_id, other_employer_id = uuid4(), uuid4(), uuid4()
    db = FakeSession(sprint=_sprint(sprint_id, owner_id))

    response = _client_request(
        db,
        _user(other_employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 403
    assert not db.executed


def test_missing_sprint_returns_not_found() -> None:
    sprint_id, employer_id = uuid4(), uuid4()
    db = FakeSession(sprint=None)

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Sprint not found"
    assert not db.executed


def test_sprint_without_attempts_returns_empty_list() -> None:
    sprint_id, employer_id = uuid4(), uuid4()
    db = FakeSession(sprint=_sprint(sprint_id, employer_id))

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 200
    assert response.json() == []
    assert db.executed


def test_only_completed_scored_attempts_are_visible_to_employers() -> None:
    sprint_id, employer_id = uuid4(), uuid4()
    visible = _attempt_row(sprint_id=sprint_id, applicant_id=uuid4())
    rows = [
        visible,
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            status="IN_PROGRESS",
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            status="EXPIRED",
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            score=None,
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            max_score=None,
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            max_score=Decimal("0"),
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            submitted_at=None,
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            application_sprint_id=uuid4(),
        ),
        _attempt_row(
            sprint_id=sprint_id,
            applicant_id=uuid4(),
            assessment_sprint_id=uuid4(),
        ),
    ]
    db = FakeSession(
        sprint=_sprint(sprint_id, employer_id),
        rows=rows,
    )

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["application_id"] == str(visible[0].id)
    assert results[0]["attempt_status"] == "SUBMITTED"
    assert results[0]["score"] == "8"
    assert results[0]["max_score"] == "10"


def test_results_are_ordered_by_percentage_then_submission_time() -> None:
    sprint_id, employer_id = uuid4(), uuid4()
    later_tie = _attempt_row(
        sprint_id=sprint_id,
        applicant_id=uuid4(),
        score=Decimal("4"),
        max_score=Decimal("5"),
        submitted_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
    )
    higher = _attempt_row(
        sprint_id=sprint_id,
        applicant_id=uuid4(),
        score=Decimal("9"),
        max_score=Decimal("10"),
        submitted_at=datetime(2026, 1, 3, tzinfo=timezone.utc),
    )
    earlier_tie = _attempt_row(
        sprint_id=sprint_id,
        applicant_id=uuid4(),
        score=Decimal("8"),
        max_score=Decimal("10"),
        submitted_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    db = FakeSession(
        sprint=_sprint(sprint_id, employer_id),
        rows=[later_tie, higher, earlier_tie],
    )

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 200
    assert [row["application_id"] for row in response.json()] == [
        str(higher[0].id),
        str(earlier_tie[0].id),
        str(later_tie[0].id),
    ]


def test_results_response_contains_no_private_assessment_data() -> None:
    sprint_id, employer_id, applicant_id = uuid4(), uuid4(), uuid4()
    db = FakeSession(
        sprint=_sprint(sprint_id, employer_id),
        rows=[_attempt_row(sprint_id=sprint_id, applicant_id=applicant_id)],
    )

    response = _client_request(
        db,
        _user(employer_id, UserRole.EMPLOYER),
        sprint_id,
    )

    assert response.status_code == 200
    result = response.json()[0]
    assert set(result) == {
        "application_id",
        "attempt_status",
        "score",
        "max_score",
        "percentage",
        "passed",
        "submitted_at",
    }
    body = response.text.casefold()
    for private_key in (
        "grading_config",
        "correct_answer",
        "accepted_answers",
        "test_cases",
        "answer_key",
    ):
        assert private_key not in body
