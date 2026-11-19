import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "application-anonymization-test-secret-key-32chars")
os.environ.setdefault("ANONYMIZATION_SECRET", "anonymization-test-secret-key-32chars-long")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.anonymization import generate_contributor_code
from app.core.dependencies import get_current_user
from app.core.token import create_access_token
from app.db.session import get_db, SessionLocal
from app.main import app
from app.models.application import Application, ApplicationStatus
from app.models.sprint import Sprint
from app.models.user import User, UserRole


def _request_as_employer(method, path, employer_id):
    client = TestClient(app)
    try:
        return client.request(
            method,
            path,
            headers={"Authorization": f"Bearer {create_access_token(str(employer_id))}"},
        )
    finally:
        client.close()


def _request_as_contributor(method, path, contributor_id):
    client = TestClient(app)
    try:
        return client.request(
            method,
            path,
            headers={"Authorization": f"Bearer {create_access_token(str(contributor_id))}"},
        )
    finally:
        client.close()


def _create_sprint(db, employer_id, sprint_id=None):
    now = datetime.now(timezone.utc)
    sprint = Sprint(
        id=sprint_id or uuid4(),
        employer_id=employer_id,
        title="Test Sprint",
        description="Sprint for anonymization tests",
        assessment_category="Python",
        skill_category=["Python"],
        difficulty="Beginner",
        task_type="Backend",
        budget=Decimal("100.00"),
        currency="NPR",
        number_of_positions=1,
        revision_limit=1,
        deadline=now + timedelta(days=5),
        application_deadline=now + timedelta(days=2),
        status="PUBLISHED",
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def _create_application(db, sprint_id, applicant_id, application_id=None):
    application = Application(
        id=application_id or uuid4(),
        sprint_id=sprint_id,
        applicant_id=applicant_id,
        status=ApplicationStatus.APPLIED.value,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return application


@pytest.fixture
def test_setup():
    db = SessionLocal()

    employer1_id = uuid4()
    employer2_id = uuid4()
    contributor1_id = uuid4()
    contributor2_id = uuid4()

    users = [
        User(
            id=user_id,
            email=f"{user_id}@test.invalid",
            password_hash="test",
            role=role,
            is_active=True,
        )
        for user_id, role in (
            (employer1_id, UserRole.EMPLOYER),
            (employer2_id, UserRole.EMPLOYER),
            (contributor1_id, UserRole.CONTRIBUTOR),
            (contributor2_id, UserRole.CONTRIBUTOR),
        )
    ]

    try:
        db.add_all(users)
        db.commit()

        sprint1 = _create_sprint(db, employer1_id)
        sprint2 = _create_sprint(db, employer1_id)

        app1_sprint1 = _create_application(db, sprint1.id, contributor1_id)
        app2_sprint1 = _create_application(db, sprint1.id, contributor2_id)
        app1_sprint2 = _create_application(db, sprint2.id, contributor1_id)

        yield SimpleNamespace(
            employer1_id=employer1_id,
            employer2_id=employer2_id,
            contributor1_id=contributor1_id,
            contributor2_id=contributor2_id,
            sprint1_id=sprint1.id,
            sprint2_id=sprint2.id,
            app1_sprint1_id=app1_sprint1.id,
            app2_sprint1_id=app2_sprint1.id,
            app1_sprint2_id=app1_sprint2.id,
        )

    finally:
        db.rollback()
        db.execute(
            delete(Application).where(
                Application.id.in_(
                    [app1_sprint1.id, app2_sprint1.id, app1_sprint2.id]
                )
            )
        )
        db.execute(delete(Sprint).where(Sprint.id.in_([sprint1.id, sprint2.id])))
        db.execute(
            delete(User).where(
                User.id.in_([employer1_id, employer2_id, contributor1_id, contributor2_id])
            )
        )
        db.commit()
        db.close()


def test_same_candidate_same_employer_different_sprints(test_setup):
    """Same candidate receives same identifier for same employer across different Sprints."""
    response1 = _request_as_employer(
        "GET",
        f"/sprints/{test_setup.sprint1_id}/applications",
        test_setup.employer1_id,
    )
    response2 = _request_as_employer(
        "GET",
        f"/sprints/{test_setup.sprint2_id}/applications",
        test_setup.employer1_id,
    )

    assert response1.status_code == 200
    assert response2.status_code == 200

    body1 = response1.json()
    body2 = response2.json()

    code1 = next(app["contributor_code"] for app in body1 if app["id"] == str(test_setup.app1_sprint1_id))
    code2 = next(app["contributor_code"] for app in body2 if app["id"] == str(test_setup.app1_sprint2_id))

    assert code1 == code2
    assert code1.startswith("Contributor #")


def test_same_candidate_different_employer(test_setup):
    """Same candidate receives different identifier for another employer."""
    db = SessionLocal()
    try:
        sprint3 = _create_sprint(db, test_setup.employer2_id)
        app3 = _create_application(db, sprint3.id, test_setup.contributor1_id)
        sprint3_id = sprint3.id
    finally:
        db.close()

    response1 = _request_as_employer(
        "GET",
        f"/sprints/{test_setup.sprint1_id}/applications",
        test_setup.employer1_id,
    )
    response2 = _request_as_employer(
        "GET",
        f"/sprints/{sprint3_id}/applications",
        test_setup.employer2_id,
    )

    assert response1.status_code == 200
    assert response2.status_code == 200

    body1 = response1.json()
    body2 = response2.json()

    code1 = next(app["contributor_code"] for app in body1 if app["id"] == str(test_setup.app1_sprint1_id))
    code2 = next(app["contributor_code"] for app in body2 if app["id"] == str(app3.id))

    assert code1 != code2


def test_different_candidates_different_identifiers(test_setup):
    """Different candidates receive different identifiers."""
    response = _request_as_employer(
        "GET",
        f"/sprints/{test_setup.sprint1_id}/applications",
        test_setup.employer1_id,
    )

    assert response.status_code == 200
    body = response.json()

    code1 = next(app["contributor_code"] for app in body if app["id"] == str(test_setup.app1_sprint1_id))
    code2 = next(app["contributor_code"] for app in body if app["id"] == str(test_setup.app2_sprint1_id))

    assert code1 != code2


def test_response_omits_applicant_id_and_personal_info(test_setup):
    """Response does not expose applicant_id or personal identity fields."""
    response = _request_as_employer(
        "GET",
        f"/sprints/{test_setup.sprint1_id}/applications",
        test_setup.employer1_id,
    )

    assert response.status_code == 200
    body = response.json()

    for app in body:
        assert "applicant_id" not in app
        assert "applicant" not in app
        assert "email" not in app
        assert "name" not in app
        assert "full_name" not in app
        assert "profile" not in app
        assert "contributor_code" in app
        assert app["contributor_code"].startswith("Contributor #")


def test_contributor_cannot_see_contributor_codes(test_setup):
    """Contributors cannot see the anonymized employer view with contributor codes."""
    response = _request_as_contributor(
        "GET",
        f"/sprints/{test_setup.sprint1_id}/applications",
        test_setup.contributor1_id,
    )

    assert response.status_code == 403


def test_generate_contributor_code_deterministic():
    """The generate_contributor_code function is deterministic."""
    employer_id = uuid4()
    applicant_id = uuid4()

    code1 = generate_contributor_code(employer_id, applicant_id)
    code2 = generate_contributor_code(employer_id, applicant_id)

    assert code1 == code2
    assert len(code1) == len("Contributor #A1B2C3D4E5F67890")


def test_generate_contributor_code_different_for_different_employer():
    """Different employers get different codes for same applicant."""
    employer1 = uuid4()
    employer2 = uuid4()
    applicant = uuid4()

    code1 = generate_contributor_code(employer1, applicant)
    code2 = generate_contributor_code(employer2, applicant)

    assert code1 != code2


def test_generate_contributor_code_different_for_different_applicant():
    """Different applicants get different codes for same employer."""
    employer = uuid4()
    applicant1 = uuid4()
    applicant2 = uuid4()

    code1 = generate_contributor_code(employer, applicant1)
    code2 = generate_contributor_code(employer, applicant2)

    assert code1 != code2