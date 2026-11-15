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

    def get(self, model: type[object], object_id: object) -> object | None:
        assert model is Sprint
        if self.sprint is not None and self.sprint.id == object_id:
            return self.sprint
        return None

    def execute(self, statement: object) -> FakeResult:
        self.executed = True
        return FakeResult(self.rows)


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
) -> tuple[SimpleNamespace, SimpleNamespace]:
    application = SimpleNamespace(
        id=uuid4(),
        applicant_id=applicant_id,
        sprint_id=sprint_id,
        applied_at=datetime.now(timezone.utc),
    )
    attempt = SimpleNamespace(
        status=status,
        score=score,
        max_score=max_score,
        submitted_at=datetime.now(timezone.utc),
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
