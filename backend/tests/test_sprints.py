
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
from app.models.employer_payment_account import EmployerPaymentAccount
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
            db=db,
        )

    finally:
        client.close()
        db.rollback()

        db.execute(delete(Payment).where(Payment.sprint_id == sprint_id))
        db.execute(delete(Sprint).where(Sprint.id == sprint_id))
        db.execute(
            delete(EmployerPaymentAccount).where(
                EmployerPaymentAccount.employer_id.in_(
                    [employer_id, other_employer_id]
                )
            )
        )
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


def _create_payment_account(
    sprint_scenario,
    employer_id=None,
    *,
    is_default=False,
):
    account = EmployerPaymentAccount(
        id=uuid.uuid4(),
        employer_id=employer_id or sprint_scenario.employer_id,
        account_type="esewa",
        account_identifier=f"{uuid.uuid4()}@test.invalid",
        is_default=is_default,
    )
    sprint_scenario.db.add(account)
    sprint_scenario.db.commit()
    return account


def _persisted_payment_account_id(sprint_id):
    db = SessionLocal()
    try:
        return db.get(Sprint, sprint_id).payment_account_id
    finally:
        db.close()


def test_employer_can_publish_own_draft_sprint(sprint_scenario):
    payment_account = _create_payment_account(
        sprint_scenario,
        is_default=True,
    )
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
        json={},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "PUBLISHED"
    assert (
        _persisted_payment_account_id(sprint_scenario.sprint_id)
        == payment_account.id
    )


def test_publish_uses_explicitly_selected_own_payment_account(sprint_scenario):
    selected_account = _create_payment_account(sprint_scenario)

    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
        json={"payment_account_id": str(selected_account.id)},
    )

    assert response.status_code == 200
    assert _persisted_payment_account_id(sprint_scenario.sprint_id) == selected_account.id


def test_publish_uses_employers_default_payment_account(sprint_scenario):
    default_account = _create_payment_account(
        sprint_scenario,
        is_default=True,
    )

    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
        json={},
    )

    assert response.status_code == 200
    assert _persisted_payment_account_id(sprint_scenario.sprint_id) == default_account.id


def test_publish_rejects_another_employers_payment_account(sprint_scenario):
    other_account = _create_payment_account(
        sprint_scenario,
        employer_id=sprint_scenario.other_employer_id,
        is_default=True,
    )

    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
        json={"payment_account_id": str(other_account.id)},
    )

    assert response.status_code == 404
    _assert_sprint_unchanged(sprint_scenario)


def test_publish_requires_a_payment_account(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.employer_id),
        json={},
    )

    assert response.status_code == 409
    assert "default payment account is required" in response.json()["detail"]
    _assert_sprint_unchanged(sprint_scenario)


def test_employer_cannot_publish_another_employers_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.other_employer_id),
        json={},
    )

    assert response.status_code == 403
    _assert_sprint_unchanged(sprint_scenario)


def test_contributor_cannot_publish_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        headers=_headers(sprint_scenario.contributor_id),
        json={},
    )

    assert response.status_code == 403
    _assert_sprint_unchanged(sprint_scenario)


def test_unauthenticated_user_cannot_publish_sprint(sprint_scenario):
    response = sprint_scenario.client.post(
        f"/sprints/{sprint_scenario.sprint_id}/publish",
        json={},
    )

    assert response.status_code == 401
    _assert_sprint_unchanged(sprint_scenario)

def _assert_sprint_unchanged(sprint_scenario):
    db = SessionLocal()
    try:
        sprint = db.get(Sprint, sprint_scenario.sprint_id)
        assert sprint.status == "DRAFT"
        assert sprint.payment_account_id is None

        payment = db.query(Payment).filter(
            Payment.sprint_id == sprint_scenario.sprint_id
        ).first()
        assert payment is None
    finally:
        db.close()

def _set_sprint_status(sprint_id, status):
    db = SessionLocal()
    try:
        sprint = db.get(Sprint, sprint_id)
        sprint.status = status
        db.commit()
    finally:
        db.close()


def test_public_user_cannot_view_draft_sprint(sprint_scenario):
    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}"
    )
    assert response.status_code == 404


def test_owning_employer_can_view_draft_sprint(sprint_scenario):
    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}",
        headers=_headers(sprint_scenario.employer_id),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "DRAFT"


def test_other_employer_cannot_view_draft_sprint(sprint_scenario):
    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}",
        headers=_headers(sprint_scenario.other_employer_id),
    )
    assert response.status_code == 404


def test_contributor_cannot_view_draft_sprint(sprint_scenario):
    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}",
        headers=_headers(sprint_scenario.contributor_id),
    )
    assert response.status_code == 404


def test_public_user_can_view_published_sprint(sprint_scenario):
    _set_sprint_status(sprint_scenario.sprint_id, "PUBLISHED")

    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}"
    )
    assert response.status_code == 200
    assert response.json()["status"] == "PUBLISHED"


def test_invalid_token_cannot_view_sprint(sprint_scenario):
    response = sprint_scenario.client.get(
        f"/sprints/{sprint_scenario.sprint_id}",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401