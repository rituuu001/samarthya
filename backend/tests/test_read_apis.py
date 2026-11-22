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
from app.models.application import Application, ApplicationStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.proof_record import ProofRecord
from app.models.sprint import Sprint
from app.models.submission import SprintSubmission, SubmissionStatus
from app.models.user import User, UserRole


@pytest.fixture
def scenario():
    db = SessionLocal()
    employer_id = uuid.uuid4()
    other_employer_id = uuid.uuid4()
    applicant_id = uuid.uuid4()
    other_applicant_id = uuid.uuid4()
    unrelated_id = uuid.uuid4()
    sprint_ids = [uuid.uuid4() for _ in range(4)]
    application_ids = [uuid.uuid4() for _ in range(4)]
    submission_ids = [uuid.uuid4() for _ in range(3)]
    payment_ids = [uuid.uuid4() for _ in range(2)]
    proof_ids = [uuid.uuid4() for _ in range(2)]
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
            (applicant_id, UserRole.CONTRIBUTOR),
            (other_applicant_id, UserRole.CONTRIBUTOR),
            (unrelated_id, UserRole.CONTRIBUTOR),
        )
    ]
    sprints = [
        Sprint(
            id=sprint_ids[0],
            employer_id=employer_id,
            title="Owned Sprint",
            description="Sprint with payment and proof",
            assessment_category="Python",
            skill_category=["Python", "FastAPI"],
            difficulty="Beginner",
            task_type="Backend",
            budget=Decimal("125.50"),
            currency="USD",
            number_of_positions=1,
            revision_limit=1,
            deadline=now + timedelta(days=2),
            application_deadline=now + timedelta(days=1),
            status="PUBLISHED",
        ),
        Sprint(
            id=sprint_ids[1],
            employer_id=other_employer_id,
            title="Other Sprint",
            description="Another user's Sprint",
            assessment_category="Frontend",
            skill_category=["TypeScript"],
            difficulty="Beginner",
            task_type="Frontend",
            budget=Decimal("77.00"),
            currency="NPR",
            number_of_positions=1,
            revision_limit=1,
            deadline=now + timedelta(days=2),
            application_deadline=now + timedelta(days=1),
            status="PUBLISHED",
        ),
        Sprint(
            id=sprint_ids[2],
            employer_id=employer_id,
            title="Sprint without payment or proof",
            description="Read response should contain null summaries",
            assessment_category="Python",
            skill_category=["Testing"],
            difficulty="Beginner",
            task_type="Backend",
            budget=Decimal("10.00"),
            currency="USD",
            number_of_positions=1,
            revision_limit=1,
            deadline=now + timedelta(days=2),
            application_deadline=now + timedelta(days=1),
            status="PUBLISHED",
        ),
        Sprint(
            id=sprint_ids[3],
            employer_id=employer_id,
            title="Sprint without applicants",
            description="Sprint with no applications",
            assessment_category="Python",
            skill_category=["Testing"],
            difficulty="Beginner",
            task_type="Backend",
            budget=Decimal("10.00"),
            currency="USD",
            number_of_positions=1,
            revision_limit=1,
            deadline=now + timedelta(days=2),
            application_deadline=now + timedelta(days=1),
            status="DRAFT",
        ),
    ]
    applications = [
        Application(
            id=application_ids[0],
            sprint_id=sprint_ids[0],
            applicant_id=applicant_id,
            status=ApplicationStatus.SELECTED.value,
        ),
        Application(
            id=application_ids[1],
            sprint_id=sprint_ids[1],
            applicant_id=other_applicant_id,
            status=ApplicationStatus.SELECTED.value,
        ),
        Application(
            id=application_ids[2],
            sprint_id=sprint_ids[2],
            applicant_id=applicant_id,
            status=ApplicationStatus.SELECTED.value,
        ),
        Application(
            id=application_ids[3],
            sprint_id=sprint_ids[0],
            applicant_id=other_applicant_id,
            status=ApplicationStatus.APPLIED.value,
        ),
    ]
    submissions = [
        SprintSubmission(
            id=submission_ids[0],
            application_id=application_ids[0],
            description="Completed first Sprint",
            file_ids=["file-1"],
            current_revision_number=0,
            status=SubmissionStatus.APPROVED.value,
            submitted_at=now,
            reviewed_at=now,
            approved_at=now,
        ),
        SprintSubmission(
            id=submission_ids[1],
            application_id=application_ids[1],
            description="Completed other Sprint",
            file_ids=["file-2"],
            current_revision_number=0,
            status=SubmissionStatus.APPROVED.value,
            submitted_at=now,
            reviewed_at=now,
            approved_at=now,
        ),
        SprintSubmission(
            id=submission_ids[2],
            application_id=application_ids[2],
            description="Submission without associated payment or proof",
            file_ids=["file-3"],
            current_revision_number=0,
            status=SubmissionStatus.SUBMITTED.value,
            submitted_at=now,
        ),
    ]
    payments = [
        Payment(
            id=payment_ids[0],
            sprint_id=sprint_ids[0],
            application_id=application_ids[0],
            payer_id=employer_id,
            payee_id=applicant_id,
            amount=Decimal("125.50"),
            currency="USD",
            payment_type=PaymentType.PAYOUT.value,
            status=PaymentStatus.RELEASED.value,
            is_simulated=True,
            transaction_reference="read-api-payment-1",
            created_at=now - timedelta(hours=1),
            completed_at=now,
        ),
        Payment(
            id=payment_ids[1],
            sprint_id=sprint_ids[1],
            application_id=application_ids[1],
            payer_id=other_employer_id,
            payee_id=other_applicant_id,
            amount=Decimal("77.00"),
            currency="NPR",
            payment_type=PaymentType.DEPOSIT.value,
            status=PaymentStatus.HELD.value,
            is_simulated=True,
            transaction_reference=None,
            created_at=now,
            completed_at=None,
        ),
    ]
    proofs = [
        ProofRecord(
            id=proof_ids[0],
            owner_id=applicant_id,
            sprint_id=sprint_ids[0],
            submission_id=submission_ids[0],
            title="Owned Sprint",
            description="Sprint with payment and proof",
            skills_demonstrated=["Python", "FastAPI"],
            verified_at=now,
        ),
        ProofRecord(
            id=proof_ids[1],
            owner_id=other_applicant_id,
            sprint_id=sprint_ids[1],
            submission_id=submission_ids[1],
            title="Other Sprint",
            description="Another user's Sprint",
            skills_demonstrated=["TypeScript"],
            verified_at=now,
        ),
    ]
    client = TestClient(app)

    try:
        db.add_all(users)
        db.commit()
        db.add_all(sprints)
        db.commit()
        db.add_all(applications)
        db.commit()
        db.add_all([*submissions, *payments])
        db.commit()
        db.add_all(proofs)
        db.commit()

        yield SimpleNamespace(
            client=client,
            employer_id=employer_id,
            other_employer_id=other_employer_id,
            applicant_id=applicant_id,
            other_applicant_id=other_applicant_id,
            unrelated_id=unrelated_id,
            sprint_ids=sprint_ids,
            application_ids=application_ids,
            submission_ids=submission_ids,
            payment_ids=payment_ids,
            proof_ids=proof_ids,
        )
    finally:
        client.close()
        db.rollback()
        db.execute(delete(ProofRecord).where(ProofRecord.id.in_(proof_ids)))
        db.execute(
            delete(SprintSubmission).where(
                SprintSubmission.id.in_(submission_ids)
            )
        )
        db.execute(delete(Payment).where(Payment.id.in_(payment_ids)))
        db.execute(
            delete(Application).where(Application.id.in_(application_ids))
        )
        db.execute(delete(Sprint).where(Sprint.id.in_(sprint_ids)))
        db.execute(
            delete(User).where(
                User.id.in_(
                    [
                        employer_id,
                        other_employer_id,
                        applicant_id,
                        other_applicant_id,
                        unrelated_id,
                    ]
                )
            )
        )
        db.commit()
        db.close()


def _headers(user_id):
    return {
        "Authorization": f"Bearer {create_access_token(str(user_id))}",
    }


def test_employer_gets_application_counts_for_only_owned_sprints(scenario):
    response = scenario.client.get(
        "/sprints/mine/applicant-counts",
        headers=_headers(scenario.employer_id),
    )

    assert response.status_code == 200
    counts_by_sprint = {
        row["sprint_id"]: row for row in response.json()
    }
    assert set(counts_by_sprint) == {
        str(scenario.sprint_ids[0]),
        str(scenario.sprint_ids[2]),
        str(scenario.sprint_ids[3]),
    }
    assert counts_by_sprint[str(scenario.sprint_ids[0])] == {
        "sprint_id": str(scenario.sprint_ids[0]),
        "total_applicants": 2,
        "selected_applicants": 1,
    }
    assert counts_by_sprint[str(scenario.sprint_ids[2])] == {
        "sprint_id": str(scenario.sprint_ids[2]),
        "total_applicants": 1,
        "selected_applicants": 1,
    }
    assert counts_by_sprint[str(scenario.sprint_ids[3])] == {
        "sprint_id": str(scenario.sprint_ids[3]),
        "total_applicants": 0,
        "selected_applicants": 0,
    }


def test_contributor_cannot_get_employer_sprint_applicant_counts(scenario):
    response = scenario.client.get(
        "/sprints/mine/applicant-counts",
        headers=_headers(scenario.applicant_id),
    )

    assert response.status_code == 403


def test_employer_sees_only_payments_they_paid(scenario):
    response = scenario.client.get(
        "/payments/me",
        headers=_headers(scenario.employer_id),
    )

    assert response.status_code == 200
    payments = response.json()
    assert [payment["id"] for payment in payments] == [
        str(scenario.payment_ids[0])
    ]
    assert payments[0]["sprint_title"] == "Owned Sprint"
    assert payments[0]["application_id"] == str(scenario.application_ids[0])
    assert Decimal(str(payments[0]["amount"])) == Decimal("125.50")
    assert payments[0]["currency"] == "USD"
    assert payments[0]["payment_type"] == "PAYOUT"
    assert payments[0]["status"] == "RELEASED"
    assert payments[0]["is_simulated"] is True
    assert payments[0]["transaction_reference"] == "read-api-payment-1"
    assert "payer_id" not in payments[0]
    assert "payee_id" not in payments[0]


def test_contributor_sees_only_payments_paid_to_them(scenario):
    response = scenario.client.get(
        "/payments/me",
        headers=_headers(scenario.applicant_id),
    )

    assert response.status_code == 200
    payments = response.json()
    assert [payment["id"] for payment in payments] == [
        str(scenario.payment_ids[0])
    ]
    assert payments[0]["completed_at"] is not None


def test_user_cannot_see_another_users_payments(scenario):
    response = scenario.client.get(
        "/payments/me",
        headers=_headers(scenario.unrelated_id),
    )

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.parametrize("user_field", ["employer_id", "applicant_id"])
def test_authorized_submission_read_includes_actual_payment_and_proof(
    scenario,
    user_field,
):
    response = scenario.client.get(
        f"/applications/{scenario.application_ids[0]}/submission",
        headers=_headers(getattr(scenario, user_field)),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(scenario.submission_ids[0])
    assert data["application_id"] == str(scenario.application_ids[0])
    assert data["status"] == SubmissionStatus.APPROVED.value
    for private_key in (
        "applicant_id",
        "applicant_name",
        "owner_id",
        "user_id",
        "email",
        "profile_id",
        "payer_id",
        "payee_id",
    ):
        assert private_key not in data
    assert data["payment"]["id"] == str(scenario.payment_ids[0])
    assert not {
        "payer_id",
        "payee_id",
        "owner_id",
        "user_id",
        "email",
        "profile_id",
    }.intersection(data["payment"])
    assert Decimal(str(data["payment"]["amount"])) == Decimal("125.50")
    assert data["payment"]["currency"] == "USD"
    assert data["payment"]["payment_type"] == "PAYOUT"
    assert data["payment"]["status"] == "RELEASED"
    assert data["payment"]["completed_at"] is not None
    assert data["proof"]["id"] == str(scenario.proof_ids[0])
    assert data["proof"]["title"] == "Owned Sprint"
    assert data["proof"]["description"] == "Sprint with payment and proof"
    assert data["proof"]["skills_demonstrated"] == ["Python", "FastAPI"]
    assert not {
        "applicant_id",
        "applicant_name",
        "owner_id",
        "user_id",
        "email",
        "profile_id",
    }.intersection(data["proof"])
    assert data["proof"]["verified_at"] == data["payment"]["completed_at"]
    assert data["proof"]["verified_at"] is not None


def test_unrelated_user_cannot_read_submission(scenario):
    response = scenario.client.get(
        f"/applications/{scenario.application_ids[0]}/submission",
        headers=_headers(scenario.unrelated_id),
    )

    assert response.status_code == 403


def test_submission_without_payment_or_proof_returns_null_summaries(scenario):
    response = scenario.client.get(
        f"/applications/{scenario.application_ids[2]}/submission",
        headers=_headers(scenario.applicant_id),
    )

    assert response.status_code == 200
    assert response.json()["payment"] is None
    assert response.json()["proof"] is None


@pytest.mark.parametrize("user_field", ["employer_id", "applicant_id"])
def test_submission_does_not_return_payment_for_another_application(
    scenario,
    user_field,
):
    db = SessionLocal()
    try:
        payment = db.get(Payment, scenario.payment_ids[0])
        payment.application_id = scenario.application_ids[3]
        payment.payee_id = scenario.other_applicant_id
        db.commit()
    finally:
        db.close()

    response = scenario.client.get(
        f"/applications/{scenario.application_ids[0]}/submission",
        headers=_headers(getattr(scenario, user_field)),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["payment"] is None
    assert data["proof"]["id"] == str(scenario.proof_ids[0])


def test_contributor_sees_only_their_own_proof_records(scenario):
    response = scenario.client.get(
        "/proof-records/me",
        headers=_headers(scenario.applicant_id),
    )

    assert response.status_code == 200
    proofs = response.json()
    assert [proof["id"] for proof in proofs] == [str(scenario.proof_ids[0])]
    assert proofs[0]["sprint_id"] == str(scenario.sprint_ids[0])
    assert proofs[0]["submission_id"] == str(scenario.submission_ids[0])
    assert proofs[0]["title"] == "Owned Sprint"
    assert proofs[0]["description"] == "Sprint with payment and proof"
    assert proofs[0]["skills_demonstrated"] == ["Python", "FastAPI"]
    assert proofs[0]["verified_at"] is not None
    assert proofs[0]["created_at"] is not None


def test_contributor_cannot_retrieve_another_users_proof_records(scenario):
    response = scenario.client.get(
        "/proof-records/me",
        headers=_headers(scenario.other_applicant_id),
    )

    assert response.status_code == 200
    assert [proof["id"] for proof in response.json()] == [
        str(scenario.proof_ids[1])
    ]
