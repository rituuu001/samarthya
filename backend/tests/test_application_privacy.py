import os
from datetime import datetime, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "application-privacy-test-secret-key")

import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.main import app
from app.models.application import ApplicationStatus
from app.models.payment import PaymentStatus, PaymentType
from app.models.submission import SubmissionStatus
from app.models.user import UserRole
from app.services import application_service, submission_service


def _request_as_employer(method, path):
    previous_overrides = app.dependency_overrides.copy()
    employer = SimpleNamespace(id=uuid4(), role=UserRole.EMPLOYER)
    app.dependency_overrides[get_db] = lambda: object()
    app.dependency_overrides[get_current_user] = lambda: employer
    try:
        with TestClient(app) as client:
            return client.request(method, path)
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous_overrides)


def _application():
    return SimpleNamespace(
        id=uuid4(),
        sprint_id=uuid4(),
        applicant_id=uuid4(),
        status=ApplicationStatus.APPLIED,
        applied_at=datetime.now(timezone.utc),
        updated_at=None,
    )


def _assert_employer_application_is_anonymous(response, application):
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(application.id)
    assert body["sprint_id"] == str(application.sprint_id)
    assert "applicant_id" not in body
    assert str(application.applicant_id) not in response.text


def test_employer_application_list_omits_applicant_id(monkeypatch):
    application = _application()
    monkeypatch.setattr(
        application_service,
        "get_sprint_applications",
        lambda db, sprint_id, employer_id: [application],
    )

    response = _request_as_employer(
        "GET",
        f"/sprints/{application.sprint_id}/applications",
    )

    assert response.status_code == 200
    body = response.json()[0]
    assert body["id"] == str(application.id)
    assert body["sprint_id"] == str(application.sprint_id)
    assert "applicant_id" not in body
    assert str(application.applicant_id) not in response.text


@pytest.mark.parametrize(
    ("action", "service_method"),
    [
        ("shortlist", "shortlist_application"),
        ("select", "select_application"),
    ],
)
def test_employer_application_actions_omit_applicant_id(
    monkeypatch,
    action,
    service_method,
):
    application = _application()
    monkeypatch.setattr(
        application_service,
        service_method,
        lambda db, application_id, employer_id: application,
    )

    response = _request_as_employer(
        "POST",
        f"/applications/{application.id}/{action}",
    )

    _assert_employer_application_is_anonymous(response, application)


def test_approved_submission_and_proof_response_remain_identity_free(monkeypatch):
    now = datetime.now(timezone.utc)
    application_id = uuid4()
    applicant_id = uuid4()
    submission = SimpleNamespace(
        id=uuid4(),
        application_id=application_id,
        description="Approved work",
        file_ids=["file-1"],
        current_revision_number=0,
        status=SubmissionStatus.APPROVED,
        submitted_at=now,
        reviewed_at=now,
        approved_at=now,
        created_at=now,
        applicant_id=applicant_id,
        applicant_name="Private Contributor",
        email="private@example.test",
        profile_id=uuid4(),
    )
    payment = SimpleNamespace(
        id=uuid4(),
        amount=Decimal("100.00"),
        currency="USD",
        payment_type=PaymentType.PAYOUT,
        status=PaymentStatus.RELEASED,
        completed_at=now,
        payer_id=uuid4(),
        payee_id=applicant_id,
    )
    proof = SimpleNamespace(
        id=uuid4(),
        title="Approved Sprint",
        description="Approved work",
        skills_demonstrated=["Python"],
        verified_at=now,
        owner_id=applicant_id,
        user_id=applicant_id,
    )
    monkeypatch.setattr(
        submission_service,
        "get_submission_detail_for_application",
        lambda db, requested_application_id, user_id: (
            submission,
            payment,
            proof,
        ),
    )

    response = _request_as_employer(
        "GET",
        f"/applications/{application_id}/submission",
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == SubmissionStatus.APPROVED.value
    assert body["proof"]["id"] == str(proof.id)
    assert body["payment"]["status"] == PaymentStatus.RELEASED.value
    serialized = response.text.casefold()
    assert str(applicant_id) not in serialized
    assert "private contributor" not in serialized
    assert "private@example.test" not in serialized
    for private_key in (
        "applicant_id",
        "applicant_name",
        "email",
        "profile_id",
        "owner_id",
        "user_id",
        "payer_id",
        "payee_id",
    ):
        assert private_key not in body
        assert private_key not in body["payment"]
        assert private_key not in body["proof"]
