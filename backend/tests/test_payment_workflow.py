import uuid
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from sqlalchemy import delete, event, func, select
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal
from app.models.application import Application, ApplicationStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.services.application_service import select_application
from app.services.sprint_service import publish_sprint


@pytest.fixture
def scenario():
    db = SessionLocal()
    employer_id = uuid.uuid4()
    applicant_ids = [uuid.uuid4(), uuid.uuid4()]
    sprint_id = uuid.uuid4()
    application_ids = [uuid.uuid4(), uuid.uuid4()]
    users = [
        User(
            id=employer_id,
            email=f"{employer_id}@test.invalid",
            password_hash="test",
            role=UserRole.EMPLOYER,
        ),
        *[
            User(
                id=applicant_id,
                email=f"{applicant_id}@test.invalid",
                password_hash="test",
                role=UserRole.CONTRIBUTOR,
            )
            for applicant_id in applicant_ids
        ],
    ]
    sprint = Sprint(
        id=sprint_id,
        employer_id=employer_id,
        title="Payment workflow test",
        description="Temporary test Sprint",
        skill_category="Python",
        difficulty="Beginner",
        task_type="Test",
        budget=125.50,
        currency="USD",
        number_of_positions=1,
        revision_limit=1,
        deadline=datetime.now(timezone.utc) + timedelta(days=2),
        application_deadline=datetime.now(timezone.utc) + timedelta(days=1),
        status="DRAFT",
    )
    applications = [
        Application(
            id=application_id,
            sprint_id=sprint_id,
            applicant_id=applicant_id,
            status=ApplicationStatus.SHORTLISTED.value,
        )
        for application_id, applicant_id in zip(application_ids, applicant_ids)
    ]

    try:
        db.add_all(users)
        db.commit()
        db.add(sprint)
        db.commit()
        db.add_all(applications)
        db.commit()

        yield SimpleNamespace(
            db=db,
            employer_id=employer_id,
            sprint_id=sprint_id,
            application_ids=application_ids,
        )
    finally:
        db.rollback()
        db.execute(delete(Payment).where(Payment.sprint_id == sprint_id))
        db.execute(delete(Application).where(Application.id.in_(application_ids)))
        db.execute(delete(Sprint).where(Sprint.id == sprint_id))
        db.execute(
            delete(User).where(User.id.in_([employer_id, *applicant_ids]))
        )
        db.commit()
        db.close()


def _payment_for_sprint(scenario, **overrides):
    sprint = scenario.db.get(Sprint, scenario.sprint_id)
    values = {
        "sprint_id": sprint.id,
        "application_id": None,
        "payer_id": sprint.employer_id,
        "payee_id": None,
        "amount": sprint.budget,
        "currency": sprint.currency,
        "payment_type": PaymentType.DEPOSIT.value,
        "status": PaymentStatus.HELD.value,
        "is_simulated": True,
        "transaction_reference": None,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
    }
    values.update(overrides)
    return Payment(**values)


def _prepare_selection(scenario, with_payment=True):
    sprint = scenario.db.get(Sprint, scenario.sprint_id)
    sprint.status = "PUBLISHED"
    if with_payment:
        scenario.db.add(_payment_for_sprint(scenario))
    scenario.db.commit()


def test_publishing_creates_one_held_deposit_payment(scenario):
    sprint = publish_sprint(scenario.db, scenario.sprint_id)
    payments = scenario.db.scalars(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    ).all()

    assert sprint.status == "PUBLISHED"
    assert len(payments) == 1
    payment = payments[0]
    assert payment.amount == sprint.budget
    assert payment.currency == sprint.currency
    assert payment.payment_type == PaymentType.DEPOSIT.value
    assert payment.status == PaymentStatus.HELD.value
    assert payment.payer_id == sprint.employer_id
    assert payment.application_id is None
    assert payment.payee_id is None
    assert payment.is_simulated is True
    assert payment.transaction_reference is None
    assert payment.created_at is not None
    assert payment.completed_at is None
    assert payment.sprint_id == sprint.id


def test_repeated_publish_does_not_create_duplicate_payment(scenario):
    publish_sprint(scenario.db, scenario.sprint_id)

    with pytest.raises(ValueError, match="Only DRAFT"):
        publish_sprint(scenario.db, scenario.sprint_id)

    assert scenario.db.scalar(
        select(func.count(Payment.id)).where(
            Payment.sprint_id == scenario.sprint_id
        )
    ) == 1


def test_publishing_reuses_valid_payment_without_changing_its_fields(scenario):
    sprint = scenario.db.get(Sprint, scenario.sprint_id)
    original_created_at = datetime(2026, 1, 2, tzinfo=timezone.utc)
    original_amount = sprint.budget
    original_currency = sprint.currency
    payment_before_publish = _payment_for_sprint(
        scenario,
        created_at=original_created_at,
    )
    scenario.db.add(payment_before_publish)
    scenario.db.commit()

    publish_sprint(scenario.db, scenario.sprint_id)

    payment = scenario.db.scalar(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    )
    assert scenario.db.scalar(
        select(func.count(Payment.id)).where(
            Payment.sprint_id == scenario.sprint_id
        )
    ) == 1
    assert payment.amount == original_amount
    assert payment.currency == original_currency
    assert payment.status == PaymentStatus.HELD.value
    assert payment.payment_type == PaymentType.DEPOSIT.value
    assert payment.payer_id == sprint.employer_id
    assert payment.created_at == original_created_at


def test_publishing_rejects_released_payment_without_changing_sprint(scenario):
    scenario.db.add(
        _payment_for_sprint(
            scenario,
            payment_type=PaymentType.PAYOUT.value,
            status=PaymentStatus.RELEASED.value,
            completed_at=datetime.now(timezone.utc),
        )
    )
    scenario.db.commit()

    with pytest.raises(ValueError, match="inconsistent Payment state"):
        publish_sprint(scenario.db, scenario.sprint_id)

    assert scenario.db.get(Sprint, scenario.sprint_id).status == "DRAFT"


def test_publishing_rejects_payment_for_another_sprint(scenario, monkeypatch):
    sprint = scenario.db.get(Sprint, scenario.sprint_id)
    payment_for_another_sprint = SimpleNamespace(
        sprint_id=uuid.uuid4(),
        status=PaymentStatus.HELD.value,
    )
    monkeypatch.setattr(
        scenario.db,
        "scalar",
        Mock(side_effect=[sprint, payment_for_another_sprint]),
    )

    with pytest.raises(ValueError, match="inconsistent Payment state"):
        publish_sprint(scenario.db, scenario.sprint_id)

    assert sprint.status == "DRAFT"


def test_payment_unique_constraint_prevents_duplicate_sprint_payment(scenario):
    publish_sprint(scenario.db, scenario.sprint_id)
    scenario.db.add(_payment_for_sprint(scenario))

    with pytest.raises(IntegrityError):
        scenario.db.commit()
    scenario.db.rollback()

    assert scenario.db.scalar(
        select(func.count(Payment.id)).where(
            Payment.sprint_id == scenario.sprint_id
        )
    ) == 1


def test_payment_creation_failure_rolls_back_sprint_publication(scenario):
    def fail_payment_insert(mapper, connection, payment):
        raise RuntimeError("payment insert failed")

    event.listen(Payment, "before_insert", fail_payment_insert)
    try:
        with pytest.raises(RuntimeError, match="payment insert failed"):
            publish_sprint(scenario.db, scenario.sprint_id)
    finally:
        event.remove(Payment, "before_insert", fail_payment_insert)

    assert scenario.db.get(Sprint, scenario.sprint_id).status == "DRAFT"
    assert scenario.db.scalar(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    ) is None


def test_selection_associates_application_with_locked_payment(scenario):
    _prepare_selection(scenario)

    application = select_application(
        scenario.db,
        scenario.application_ids[0],
        scenario.employer_id,
    )
    payment = scenario.db.scalar(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    )

    assert application.status == ApplicationStatus.SELECTED.value
    assert payment.application_id == application.id
    assert payment.payee_id == application.applicant_id
    assert payment.payment_type == PaymentType.DEPOSIT.value
    assert payment.status == PaymentStatus.HELD.value
    assert application.sprint_id == payment.sprint_id


def test_only_one_application_can_be_selected_for_sprint(scenario):
    _prepare_selection(scenario)
    first_application = select_application(
        scenario.db,
        scenario.application_ids[0],
        scenario.employer_id,
    )

    with pytest.raises(ValueError, match="already has a selected applicant"):
        select_application(
            scenario.db,
            scenario.application_ids[1],
            scenario.employer_id,
        )

    payment = scenario.db.scalar(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    )
    second_application = scenario.db.get(Application, scenario.application_ids[1])
    assert payment.application_id == first_application.id
    assert payment.payee_id == first_application.applicant_id
    assert second_application.status == ApplicationStatus.SHORTLISTED.value


def test_selection_fails_when_sprint_has_no_payment(scenario):
    _prepare_selection(scenario, with_payment=False)

    with pytest.raises(ValueError, match="does not have a Payment"):
        select_application(
            scenario.db,
            scenario.application_ids[0],
            scenario.employer_id,
        )

    application = scenario.db.get(Application, scenario.application_ids[0])
    assert application.status == ApplicationStatus.SHORTLISTED.value


def test_payment_association_failure_rolls_back_application_selection(scenario):
    _prepare_selection(scenario)

    def fail_payment_update(mapper, connection, payment):
        raise RuntimeError("payment update failed")

    event.listen(Payment, "before_update", fail_payment_update)
    try:
        with pytest.raises(RuntimeError, match="payment update failed"):
            select_application(
                scenario.db,
                scenario.application_ids[0],
                scenario.employer_id,
            )
    finally:
        event.remove(Payment, "before_update", fail_payment_update)

    application = scenario.db.get(Application, scenario.application_ids[0])
    payment = scenario.db.scalar(
        select(Payment).where(Payment.sprint_id == scenario.sprint_id)
    )
    assert application.status == ApplicationStatus.SHORTLISTED.value
    assert payment.application_id is None
    assert payment.payee_id is None
