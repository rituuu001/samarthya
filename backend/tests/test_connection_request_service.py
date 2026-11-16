from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest

from app.models.assessment import AssessmentAttempt
from app.models.application import ApplicationStatus
from app.models.connection_request import (
    ConnectionRequest,
    ConnectionRequestStatus,
)
from app.models.user import UserRole
from app.models.user_profile import UserProfile
from app.schemas.connection_request import (
    ConnectionRequestIdentityResponse,
    ConnectionRequestResponse,
)
from app.services.connection_request_service import (
    create_connection_request,
    get_connection_request_for_employer,
    get_revealed_identity,
    list_connection_requests_for_contributor,
    respond_to_connection_request,
)

_DEFAULT_ASSESSMENT_SUBMITTED_AT = object()


class FakeResult:
    def __init__(self, rows: list[object]) -> None:
        self.rows = rows

    def all(self) -> list[object]:
        return self.rows


class FakeSession:
    def __init__(
        self,
        *,
        users: dict[UUID, object],
        applications: dict[UUID, object],
        sprints: dict[UUID, object],
        requests: list[ConnectionRequest],
        assessment_attempt: object | None,
        assessment_sprint_id: UUID | None,
        profiles: dict[UUID, UserProfile] | None = None,
    ) -> None:
        self.users = users
        self.applications = applications
        self.sprints = sprints
        self.requests_by_application = {
            request.application_id: request for request in requests
        }
        self.requests_by_id = {request.id: request for request in requests}
        self.assessment_attempt = assessment_attempt
        self.assessment_sprint_id = assessment_sprint_id
        self.profiles = profiles or {}
        self.added: list[object] = []
        self.refreshed: list[object] = []
        self.committed = 0
        self.scalar_entities: list[type[object]] = []
        self.profile_lookups = 0
        self.locked_request_ids: list[UUID] = []
        self.assessment_queries: list[object] = []

    def get(self, model: type[object], object_id: UUID) -> object | None:
        if model.__name__ == "User":
            return self.users.get(object_id)
        if model.__name__ == "Application":
            return self.applications.get(object_id)
        if model.__name__ == "Sprint":
            return self.sprints.get(object_id)
        if model is ConnectionRequest:
            return self.requests_by_id.get(object_id)
        raise AssertionError(f"Unexpected model lookup: {model.__name__}")

    def scalar(self, statement: object) -> object | None:
        entity = statement.column_descriptions[0]["entity"]
        self.scalar_entities.append(entity)
        identifier = next(
            value
            for value in statement.compile().params.values()
            if isinstance(value, UUID)
        )
        if entity is ConnectionRequest:
            criterion = statement.whereclause
            if criterion.left.name == "id":
                if statement._for_update_arg is not None:
                    self.locked_request_ids.append(identifier)
                return self.requests_by_id.get(identifier)
            return self.requests_by_application.get(identifier)
        if entity is UserProfile:
            self.profile_lookups += 1
            return self.profiles.get(identifier)
        if entity is AssessmentAttempt:
            self.assessment_queries.append(statement)
            sql = str(statement)
            for condition in (
                "assessment_attempts.application_id = applications.id",
                "sprint_assessments.id = assessment_attempts.sprint_assessment_id",
                "applications.id =",
                "applications.sprint_id =",
                "sprint_assessments.sprint_id =",
                "assessment_attempts.status =",
                "assessment_attempts.submitted_at IS NOT NULL",
                "assessment_attempts.score IS NOT NULL",
                "assessment_attempts.max_score IS NOT NULL",
                "assessment_attempts.max_score >",
            ):
                assert condition in sql
            parameters = statement.compile().params.values()
            assert "SUBMITTED" in parameters
            assert any(value == 0 for value in parameters)
            attempt = self.assessment_attempt
            if attempt is None:
                return None
            application = self.applications.get(attempt.application_id)
            if (
                application is None
                or attempt.status != "SUBMITTED"
                or attempt.submitted_at is None
                or attempt.score is None
                or attempt.max_score is None
                or Decimal(attempt.max_score) <= 0
                or application.sprint_id != self.assessment_sprint_id
            ):
                return None
            return attempt
        raise AssertionError(f"Unexpected scalar query: {entity.__name__}")

    def scalars(self, statement: object) -> FakeResult:
        contributor_id = next(
            value
            for value in statement.compile().params.values()
            if isinstance(value, UUID)
        )
        requests = [
            request
            for request in self.requests_by_application.values()
            if self.applications[request.application_id].applicant_id
            == contributor_id
        ]
        return FakeResult(requests)

    def add(self, instance: object) -> None:
        assert isinstance(instance, ConnectionRequest)
        if instance.id is None:
            instance.id = uuid4()
        self.requests_by_application[instance.application_id] = instance
        self.requests_by_id[instance.id] = instance
        self.added.append(instance)

    def commit(self) -> None:
        self.committed += 1
        now = datetime.now(timezone.utc)
        for instance in self.added:
            if isinstance(instance, ConnectionRequest):
                if instance.created_at is None:
                    instance.created_at = now
                if instance.updated_at is None:
                    instance.updated_at = now

    def rollback(self) -> None:
        pass

    def refresh(self, instance: object) -> None:
        self.refreshed.append(instance)


def _scenario(
    *,
    application_status: str = ApplicationStatus.APPLIED.value,
    request_status: str | None = None,
    employer_owns_sprint: bool = True,
    include_profile: bool = True,
    assessment_status: str | None = "SUBMITTED",
    assessment_score: Decimal | None = Decimal("8"),
    assessment_max_score: Decimal | None = Decimal("10"),
    assessment_submitted_at: datetime | None | object = (
        _DEFAULT_ASSESSMENT_SUBMITTED_AT
    ),
    assessment_sprint_matches: bool = True,
):
    employer_id, other_employer_id = uuid4(), uuid4()
    contributor_id, other_contributor_id = uuid4(), uuid4()
    sprint_id, application_id = uuid4(), uuid4()
    request_id = uuid4()
    profile_picture_id = uuid4()
    now = datetime.now(timezone.utc)

    users = {
        employer_id: SimpleNamespace(
            id=employer_id,
            email="employer@example.test",
            role=UserRole.EMPLOYER,
            is_active=True,
        ),
        other_employer_id: SimpleNamespace(
            id=other_employer_id,
            email="other-employer@example.test",
            role=UserRole.EMPLOYER,
            is_active=True,
        ),
        contributor_id: SimpleNamespace(
            id=contributor_id,
            email="contributor@example.test",
            role=UserRole.CONTRIBUTOR,
            is_active=True,
        ),
        other_contributor_id: SimpleNamespace(
            id=other_contributor_id,
            email="other-contributor@example.test",
            role=UserRole.CONTRIBUTOR,
            is_active=True,
        ),
    }
    application = SimpleNamespace(
        id=application_id,
        sprint_id=sprint_id,
        applicant_id=contributor_id,
        status=application_status,
    )
    sprint = SimpleNamespace(
        id=sprint_id,
        employer_id=employer_id if employer_owns_sprint else other_employer_id,
    )
    assessment_attempt = None
    assessment_sprint_id = sprint_id if assessment_sprint_matches else uuid4()
    if assessment_status is not None:
        assessment_attempt = SimpleNamespace(
            id=uuid4(),
            application_id=application_id,
            sprint_assessment_id=uuid4(),
            status=assessment_status,
            submitted_at=(
                now
                if assessment_submitted_at is _DEFAULT_ASSESSMENT_SUBMITTED_AT
                else assessment_submitted_at
            ),
            score=assessment_score,
            max_score=assessment_max_score,
        )
    requests = []
    if request_status is not None:
        requests.append(
            ConnectionRequest(
                id=request_id,
                application_id=application_id,
                status=request_status,
                created_at=now,
                updated_at=now,
                responded_at=now
                if request_status != ConnectionRequestStatus.PENDING.value
                else None,
            )
        )

    profiles = {}
    if include_profile:
        profiles[contributor_id] = UserProfile(
            id=uuid4(),
            user_id=contributor_id,
            full_name="Contributor Example",
            profile_picture_id=profile_picture_id,
            location="Private Location",
            skills=["Private Skill"],
            education=[{"institution": "Private Institution"}],
        )

    db = FakeSession(
        users=users,
        applications={application_id: application},
        sprints={sprint_id: sprint},
        requests=requests,
        assessment_attempt=assessment_attempt,
        assessment_sprint_id=assessment_sprint_id,
        profiles=profiles,
    )
    return SimpleNamespace(
        db=db,
        users=users,
        employer_id=employer_id,
        other_employer_id=other_employer_id,
        contributor_id=contributor_id,
        other_contributor_id=other_contributor_id,
        sprint_id=sprint_id,
        application=application,
        request=requests[0] if requests else None,
        assessment_attempt=assessment_attempt,
        profile_picture_id=profile_picture_id,
    )


def _assert_request_response_is_identity_free(
    response: ConnectionRequestResponse,
) -> None:
    assert set(response.model_dump()) == {
        "id",
        "application_id",
        "status",
        "created_at",
        "updated_at",
        "responded_at",
    }


@pytest.mark.parametrize(
    "application_status",
    [
        ApplicationStatus.APPLIED.value,
        ApplicationStatus.ASSESSMENT_SUBMITTED.value,
        ApplicationStatus.SHORTLISTED.value,
        ApplicationStatus.SELECTED.value,
    ],
)
def test_employer_can_create_request_for_completed_scored_application(
    application_status,
):
    scenario = _scenario(application_status=application_status)

    connection_request = create_connection_request(
        scenario.db,
        scenario.application.id,
        scenario.employer_id,
    )
    response = ConnectionRequestResponse.model_validate(connection_request)

    _assert_request_response_is_identity_free(response)
    assert response.status == ConnectionRequestStatus.PENDING
    assert response.application_id == scenario.application.id
    assert scenario.db.committed == 1
    assert scenario.db.refreshed == [connection_request]
    assert len(scenario.db.assessment_queries) == 1


def test_employer_can_create_request_before_selection():
    scenario = _scenario()

    connection_request = create_connection_request(
        scenario.db,
        scenario.application.id,
        scenario.employer_id,
    )
    response = ConnectionRequestResponse.model_validate(connection_request)

    _assert_request_response_is_identity_free(response)
    assert response.status == ConnectionRequestStatus.PENDING
    assert response.application_id == scenario.application.id
    assert scenario.db.committed == 1
    assert scenario.db.refreshed == [connection_request]


def test_employer_cannot_create_request_for_another_employers_application():
    scenario = _scenario(employer_owns_sprint=False)

    with pytest.raises(PermissionError, match="Sprint's employer"):
        create_connection_request(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.committed == 0


@pytest.mark.parametrize(
    "assessment_status",
    ["IN_PROGRESS", "EXPIRED"],
)
def test_incomplete_or_expired_assessment_cannot_create_request(assessment_status):
    scenario = _scenario(assessment_status=assessment_status)

    with pytest.raises(ValueError, match="completed and scored"):
        create_connection_request(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.committed == 0


@pytest.mark.parametrize(
    "assessment_changes",
    [
        {"assessment_status": None},
        {"assessment_score": None},
        {"assessment_max_score": None},
        {"assessment_max_score": Decimal("0")},
        {"assessment_submitted_at": None},
        {"assessment_sprint_matches": False},
    ],
)
def test_missing_or_invalid_scored_assessment_cannot_create_request(
    assessment_changes,
):
    scenario = _scenario(**assessment_changes)

    with pytest.raises(ValueError, match="completed and scored"):
        create_connection_request(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.committed == 0


def test_duplicate_request_is_rejected():
    scenario = _scenario(request_status=ConnectionRequestStatus.REJECTED.value)

    with pytest.raises(ValueError, match="already exists"):
        create_connection_request(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.committed == 0


def test_employer_can_get_request_for_their_application():
    scenario = _scenario(request_status=ConnectionRequestStatus.PENDING.value)

    connection_request = get_connection_request_for_employer(
        scenario.db,
        scenario.application.id,
        scenario.employer_id,
    )
    response = ConnectionRequestResponse.model_validate(connection_request)

    _assert_request_response_is_identity_free(response)
    assert response.id == scenario.request.id


def test_contributor_can_list_only_their_own_requests():
    scenario = _scenario(request_status=ConnectionRequestStatus.PENDING.value)
    other_application_id = uuid4()
    other_request = ConnectionRequest(
        id=uuid4(),
        application_id=other_application_id,
        status=ConnectionRequestStatus.ACCEPTED.value,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        responded_at=datetime.now(timezone.utc),
    )
    scenario.db.applications[other_application_id] = SimpleNamespace(
        id=other_application_id,
        applicant_id=scenario.other_contributor_id,
    )
    scenario.db.add(other_request)

    requests = list_connection_requests_for_contributor(
        scenario.db,
        scenario.contributor_id,
    )

    assert [request.id for request in requests] == [scenario.request.id]
    for request in requests:
        _assert_request_response_is_identity_free(
            ConnectionRequestResponse.model_validate(request)
        )


def test_contributor_cannot_respond_to_another_contributors_request():
    scenario = _scenario(request_status=ConnectionRequestStatus.PENDING.value)

    with pytest.raises(PermissionError, match="own connection requests"):
        respond_to_connection_request(
            scenario.db,
            scenario.request.id,
            scenario.other_contributor_id,
            accept=True,
        )

    assert scenario.request.status == ConnectionRequestStatus.PENDING.value
    assert scenario.db.committed == 0


@pytest.mark.parametrize(
    ("accept", "expected_status"),
    [
        (True, ConnectionRequestStatus.ACCEPTED),
        (False, ConnectionRequestStatus.REJECTED),
    ],
)
def test_contributor_can_respond_to_pending_request_without_changing_application(
    accept,
    expected_status,
):
    scenario = _scenario(request_status=ConnectionRequestStatus.PENDING.value)
    original_application_status = scenario.application.status

    connection_request = respond_to_connection_request(
        scenario.db,
        scenario.request.id,
        scenario.contributor_id,
        accept=accept,
    )

    assert connection_request.status == expected_status.value
    assert connection_request.responded_at.tzinfo is not None
    assert scenario.application.status == original_application_status
    assert scenario.db.committed == 1
    assert scenario.db.refreshed == [connection_request]


@pytest.mark.parametrize(
    "request_status",
    [ConnectionRequestStatus.ACCEPTED.value, ConnectionRequestStatus.REJECTED.value],
)
def test_already_answered_request_cannot_be_responded_to_again(request_status):
    scenario = _scenario(request_status=request_status)

    with pytest.raises(ValueError, match="Only PENDING"):
        respond_to_connection_request(
            scenario.db,
            scenario.request.id,
            scenario.contributor_id,
            accept=True,
        )

    assert scenario.db.committed == 0


@pytest.mark.parametrize(
    ("accept", "expected_status"),
    [
        (True, ConnectionRequestStatus.ACCEPTED.value),
        (False, ConnectionRequestStatus.REJECTED.value),
    ],
)
def test_response_transition_locks_request_and_cannot_be_repeated(
    accept,
    expected_status,
):
    scenario = _scenario(request_status=ConnectionRequestStatus.PENDING.value)

    connection_request = respond_to_connection_request(
        scenario.db,
        scenario.request.id,
        scenario.contributor_id,
        accept=accept,
    )

    assert connection_request.status == expected_status
    assert scenario.db.locked_request_ids == [scenario.request.id]
    with pytest.raises(ValueError, match="Only PENDING"):
        respond_to_connection_request(
            scenario.db,
            scenario.request.id,
            scenario.contributor_id,
            accept=not accept,
        )

    assert scenario.request.status == expected_status
    assert scenario.db.committed == 1
    assert scenario.db.locked_request_ids == [
        scenario.request.id,
        scenario.request.id,
    ]


@pytest.mark.parametrize(
    "request_status",
    [ConnectionRequestStatus.PENDING.value, ConnectionRequestStatus.REJECTED.value],
)
def test_employer_cannot_get_identity_without_acceptance(request_status):
    scenario = _scenario(request_status=request_status)

    with pytest.raises(PermissionError, match="only after accepting"):
        get_revealed_identity(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.profile_lookups == 0


def test_employer_gets_only_allowed_identity_after_acceptance():
    scenario = _scenario(request_status=ConnectionRequestStatus.ACCEPTED.value)

    identity = get_revealed_identity(
        scenario.db,
        scenario.application.id,
        scenario.employer_id,
    )
    response = ConnectionRequestIdentityResponse.model_validate(identity)

    assert response.connection_request.id == scenario.request.id
    assert response.connection_request.status == ConnectionRequestStatus.ACCEPTED
    assert response.contributor.user_id == scenario.contributor_id
    assert response.contributor.full_name == "Contributor Example"
    assert response.contributor.email == "contributor@example.test"
    assert response.contributor.profile_picture_id == scenario.profile_picture_id
    assert set(response.model_dump()["contributor"]) == {
        "user_id",
        "full_name",
        "email",
        "profile_picture_id",
    }
    assert scenario.db.profile_lookups == 1


def test_identity_lookup_requires_a_contributor_profile():
    scenario = _scenario(
        request_status=ConnectionRequestStatus.ACCEPTED.value,
        include_profile=False,
    )

    with pytest.raises(LookupError, match="Contributor profile not found"):
        get_revealed_identity(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )


def test_employer_cannot_get_identity_for_another_employers_application():
    scenario = _scenario(
        request_status=ConnectionRequestStatus.ACCEPTED.value,
        employer_owns_sprint=False,
    )

    with pytest.raises(PermissionError, match="Sprint's employer"):
        get_revealed_identity(
            scenario.db,
            scenario.application.id,
            scenario.employer_id,
        )

    assert scenario.db.profile_lookups == 0
