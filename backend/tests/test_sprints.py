
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete

from app.core.token import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.payment import Payment
from app.models.sprint import Sprint
from app.models.user import User, UserRole


@pytest.fixture
def sprint_scenario():
    db = SessionLocal()

    employer_id = uuid.uuid4()
    other_employer_id = uuid.uuid4()
    contributor_id = uuid.uuid4()
    sprint_id = uuid.uuid4()

    now = datetime.now(timezone.utc)

    users = [
        User(
            id=user_id,
            email=f"{user_id}@test.invalid",
            password_hash="test",
            role=role,
        )
        for user_id, role in (
            (employer_id, UserRole.EMPLOYER),
            (other_employer_id, UserRole.EMPLOYER),
            (contributor_id, UserRole.CONTRIBUTOR),
        )
    ]

    sprint = Sprint(
        id=sprint_id,
        employer_id=employer_id,
        title="Test Sprint",
        description="Sprint for publishing tests",
        skill_category=["Python"],
        difficulty="Beginner",
        task_type="Backend",
        budget=Decimal("100.00"),
        currency="NPR",
        number_of_positions=1,
        revision_limit=1,
        deadline=now + timedelta(days=5),
        application_deadline=now + timedelta(days=2),
        status="DRAFT",
    )

    client = TestClient(app)

    try:
        db.add_all(users)
        db.commit()

        db.add(sprint)
        db.commit()

        yield SimpleNamespace(
            client=client,
            employer_id=employer_id,
            other_employer_id=other_employer_id,
            contributor_id=contributor_id,
            sprint_id=sprint_id,
        )

    finally:
        client.close()
        db.rollback()

        db.execute(delete(Payment).where(Payment.sprint_id == sprint_id))
        db.execute(delete(Sprint).where(Sprint.id == sprint_id))
        db.execute(
            delete(User).where(
                User.id.in_(
                    [employer_id, other_employer_id, contributor_id]
                )
            )
        )

        db.commit()
        db.close()


def _headers(user_id):
    return {
        "Authorization": f"Bearer {create_access_token(str(user_id))}",
    }


def test_employer_can_publish_own_draft_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PUBLISHED"


def test_employer_cannot_publish_another_employers_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.other_employer_id),
    )

    assert response.status_code == 403
    _assert_sprint_unchanged(sprint_scenario)


def test_contributor_cannot_publish_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.contributor_id),
    )

    assert response.status_code == 403
    _assert_sprint_unchanged(sprint_scenario)


def test_unauthenticated_user_cannot_publish_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
    )

    assert response.status_code == 401
    _assert_sprint_unchanged(sprint_scenario)

def _assert_sprint_unchanged(sprint_scenario):
    db = SessionLocal()
    try:
        sprint = db.get(Sprint, sprint_scenario.sprint_id)
        assert sprint.status == "DRAFT"

        payment = db.query(Payment).filter(
            Payment.sprint_id == sprint_scenario.sprint_id
        ).first()
        assert payment is None
    finally:
        db.close()