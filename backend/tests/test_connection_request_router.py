import os
from datetime import datetime, timezone
from types import SimpleNamespace
from uuid import uuid4
from unittest.mock import Mock

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "connection-request-router-test-secret")

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.application import Application
from app.models.connection_request import (
    ConnectionRequest,
    ConnectionRequestStatus,
)
from app.models.user import UserRole
from app.services import connection_request_service


def _request_as_user(method, path, user, db=None):
    previous_overrides = app.dependency_overrides.copy()
    if db is None:
        db = object()
    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with TestClient(app) as client:
            response = client.request(method, path)
        return response, db
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def _user(role: UserRole):
    return SimpleNamespace(id=uuid4(), role=role)


def _connection_request(status: ConnectionRequestStatus):
    now = datetime.now(timezone.utc)
    return SimpleNamespace(
        id=uuid4(),
        application_id=uuid4(),
        status=status.value,
        created_at=now,
        updated_at=now,
        responded_at=now if status != ConnectionRequestStatus.PENDING else None,
        applicant_id=uuid4(),
        applicant_name="Private Contributor",
        email="private@example.test",
    )


def _identity_payload():
    now = datetime.now(timezone.utc)
    return {
        "connection_request": {
            "id": uuid4(),
            "application_id": uuid4(),
            "status": ConnectionRequestStatus.ACCEPTED.value,
            "created_at": now,
            "updated_at": now,
            "responded_at": now,
            "applicant_id": uuid4(),
        },
        "contributor": {
            "user_id": uuid4(),
            "full_name": "Contributor Example",
            "email": "contributor@example.test",
            "profile_picture_id": uuid4(),
            "location": "Private Location",
            "education": [{"institution": "Private Institution"}],
            "skills": ["Private Skill"],
            "bio": "Private bio",
            "organization": "Private organization",
            "website": "https://private.example.test",
            "password_hash": "private hash",
        },
    }


class ResponseSession:
    def __init__(self, user, application, connection_request):
        self.user = user
        self.application = application
        self.connection_request = connection_request
        self.committed = 0

    def get(self, model, object_id):
        if model.__name__ == "User" and object_id == self.user.id:
            return self.user
        if model is ConnectionRequest and object_id == self.connection_request.id:
            return self.connection_request
        if model is Application and object_id == self.application.id:
            return self.application
        return None

    def commit(self):
        self.committed += 1

    def refresh(self, instance):
        assert instance is self.connection_request


def _assert_request_is_identity_free(response):
    body = response.json()
    assert set(body) == {
        "id",
        "application_id",
        "status",
        "created_at",
        "updated_at",
        "responded_at",
    }
    for private_value in (
        "applicant_id",
        "applicant_name",
        "private@example.test",
    ):
        assert private_value not in response.text


def test_employer_can_create_connection_request(monkeypatch):
    employer = _user(UserRole.EMPLOYER)
    application_id = uuid4()
    connection_request = _connection_request(ConnectionRequestStatus.PENDING)
    service_call = Mock(return_value=connection_request)
    monkeypatch.setattr(
        connection_request_service,
        "create_connection_request",
        service_call,
    )

    response, db = _request_as_user(
        "POST",
        f"/applications/{application_id}/connection-request",
        employer,
    )

    assert response.status_code == 201
    _assert_request_is_identity_free(response)
    service_call.assert_called_once_with(db, application_id, employer.id)


def test_contributor_cannot_create_connection_request(monkeypatch):
    service_call = Mock()
    monkeypatch.setattr(
        connection_request_service,
        "create_connection_request",
        service_call,
    )

    response, _ = _request_as_user(
        "POST",
        f"/applications/{uuid4()}/connection-request",
        _user(UserRole.CONTRIBUTOR),
    )

    assert response.status_code == 403
    service_call.assert_not_called()


@pytest.mark.parametrize(
    ("error", "expected_status"),
    [
        (PermissionError("Only the Sprint's employer can manage applications"), 403),
        (
            ValueError(
                "Connection requests require a completed and scored assessment"
            ),
            409,
        ),
        (ValueError("A connection request already exists for this Application"), 409),
        (LookupError("Application not found"), 404),
    ],
)
def test_employer_create_maps_service_errors(
    monkeypatch,
    error,
    expected_status,
):
    monkeypatch.setattr(
        connection_request_service,
        "create_connection_request",
        Mock(side_effect=error),
    )

    response, _ = _request_as_user(
        "POST",
        f"/applications/{uuid4()}/connection-request",
        _user(UserRole.EMPLOYER),
    )

    assert response.status_code == expected_status


def test_employer_can_get_identity_free_request(monkeypatch):
    employer = _user(UserRole.EMPLOYER)
    application_id = uuid4()
    connection_request = _connection_request(ConnectionRequestStatus.PENDING)
    service_call = Mock(return_value=connection_request)
    monkeypatch.setattr(
        connection_request_service,
        "get_connection_request_for_employer",
        service_call,
    )

    response, db = _request_as_user(
        "GET",
        f"/applications/{application_id}/connection-request",
        employer,
    )

    assert response.status_code == 200
    _assert_request_is_identity_free(response)
    service_call.assert_called_once_with(db, application_id, employer.id)


def test_employer_get_request_maps_missing_application_or_request_to_404(
    monkeypatch,
):
    monkeypatch.setattr(
        connection_request_service,
        "get_connection_request_for_employer",
        Mock(side_effect=LookupError("Connection request not found")),
    )

    response, _ = _request_as_user(
        "GET",
        f"/applications/{uuid4()}/connection-request",
        _user(UserRole.EMPLOYER),
    )

    assert response.status_code == 404


def test_contributor_can_list_only_their_own_requests(monkeypatch):
    contributor = _user(UserRole.CONTRIBUTOR)
    own_request = _connection_request(ConnectionRequestStatus.PENDING)
    other_request = _connection_request(ConnectionRequestStatus.PENDING)
    service_call = Mock(
        side_effect=lambda db, contributor_id: (
            [own_request] if contributor_id == contributor.id else [other_request]
        )
    )
    monkeypatch.setattr(
        connection_request_service,
        "list_connection_requests_for_contributor",
        service_call,
    )

    response, db = _request_as_user(
        "GET",
        f"/connection-requests?contributor_id={uuid4()}",
        contributor,
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(own_request.id)]
    assert "applicant_id" not in response.json()[0]
    service_call.assert_called_once_with(db, contributor.id)


@pytest.mark.parametrize(
    ("action", "accept", "status"),
    [
        ("accept", True, ConnectionRequestStatus.ACCEPTED),
        ("reject", False, ConnectionRequestStatus.REJECTED),
    ],
)
def test_contributor_can_respond_to_own_pending_request(
    monkeypatch,
    action,
    accept,
    status,
):
    contributor = _user(UserRole.CONTRIBUTOR)
    request = _connection_request(status)
    request_id = request.id
    service_call = Mock(return_value=request)
    monkeypatch.setattr(
        connection_request_service,
        "respond_to_connection_request",
        service_call,
    )

    response, db = _request_as_user(
        "POST",
        f"/connection-requests/{request_id}/{action}",
        contributor,
    )

    assert response.status_code == 200
    _assert_request_is_identity_free(response)
    service_call.assert_called_once_with(
        db,
        request_id,
        contributor.id,
        accept=accept,
    )


@pytest.mark.parametrize(
    ("action", "error", "expected_status"),
    [
        ("accept", PermissionError("Not your request"), 403),
        ("reject", PermissionError("Not your request"), 403),
        ("accept", ValueError("Only PENDING connection requests can be answered"), 409),
        ("reject", ValueError("Only PENDING connection requests can be answered"), 409),
        ("accept", LookupError("Connection request not found"), 404),
        ("reject", LookupError("Connection request not found"), 404),
    ],
)
def test_contributor_response_maps_service_errors(
    monkeypatch,
    action,
    error,
    expected_status,
):
    service_call = Mock(side_effect=error)
    monkeypatch.setattr(
        connection_request_service,
        "respond_to_connection_request",
        service_call,
    )

    response, _ = _request_as_user(
        "POST",
        f"/connection-requests/{uuid4()}/{action}",
        _user(UserRole.CONTRIBUTOR),
    )

    assert response.status_code == expected_status


@pytest.mark.parametrize(
    ("request_status", "error"),
    [
        (ConnectionRequestStatus.PENDING, PermissionError("Not accepted")),
        (ConnectionRequestStatus.REJECTED, PermissionError("Not accepted")),
    ],
)
def test_employer_cannot_see_identity_before_acceptance(
    monkeypatch,
    request_status,
    error,
):
    monkeypatch.setattr(
        connection_request_service,
        "get_revealed_identity",
        Mock(side_effect=error),
    )

    response, _ = _request_as_user(
        "GET",
        f"/applications/{uuid4()}/connection-request/identity",
        _user(UserRole.EMPLOYER),
    )

    assert response.status_code == 403


def test_employer_gets_only_allowlisted_identity_after_acceptance(monkeypatch):
    payload = _identity_payload()
    monkeypatch.setattr(
        connection_request_service,
        "get_revealed_identity",
        Mock(return_value=payload),
    )

    response, _ = _request_as_user(
        "GET",
        f"/applications/{uuid4()}/connection-request/identity",
        _user(UserRole.EMPLOYER),
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"connection_request", "contributor"}
    assert set(body["connection_request"]) == {
        "id",
        "application_id",
        "status",
        "created_at",
        "updated_at",
        "responded_at",
    }
    assert set(body["contributor"]) == {
        "user_id",
        "full_name",
        "email",
        "profile_picture_id",
    }
    serialized = response.text.casefold()
    for private_value in (
        "location",
        "education",
        "skills",
        "bio",
        "organization",
        "website",
        "password_hash",
        "private location",
        "private institution",
        "private skill",
        "private bio",
        "private organization",
    ):
        assert private_value not in serialized


def test_unrelated_employer_cannot_see_revealed_identity(monkeypatch):
    monkeypatch.setattr(
        connection_request_service,
        "get_revealed_identity",
        Mock(side_effect=PermissionError("Only the Sprint's employer can view it")),
    )

    response, _ = _request_as_user(
        "GET",
        f"/applications/{uuid4()}/connection-request/identity",
        _user(UserRole.EMPLOYER),
    )

    assert response.status_code == 403


@pytest.mark.parametrize(
    ("action", "status"),
    [
        ("accept", ConnectionRequestStatus.ACCEPTED),
        ("reject", ConnectionRequestStatus.REJECTED),
    ],
)
def test_endpoint_responses_do_not_change_application_status(
    action,
    status,
):
    contributor = _user(UserRole.CONTRIBUTOR)
    contributor.is_active = True
    application = SimpleNamespace(
        id=uuid4(),
        applicant_id=contributor.id,
        status="SELECTED",
    )
    now = datetime.now(timezone.utc)
    connection_request = ConnectionRequest(
        id=uuid4(),
        application_id=application.id,
        status=ConnectionRequestStatus.PENDING.value,
        created_at=now,
        updated_at=now,
        responded_at=None,
    )
    db = ResponseSession(contributor, application, connection_request)

    response, _ = _request_as_user(
        "POST",
        f"/connection-requests/{connection_request.id}/{action}",
        contributor,
        db=db,
    )

    assert response.status_code == 200
    assert application.status == "SELECTED"
    assert connection_request.status == status.value
    assert db.committed == 1
