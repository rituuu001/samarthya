from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate


def create_sprint(
    db: Session,
    sprint_data: SprintCreate,
    employer_id: UUID,
) -> Sprint:
    sprint = Sprint(
        employer_id=employer_id,
        title=sprint_data.title,
        description=sprint_data.description,
        skill_category=sprint_data.skill_category,
        difficulty=sprint_data.difficulty,
        task_type=sprint_data.task_type,
        budget=sprint_data.budget,
        currency=sprint_data.currency,
        number_of_positions=sprint_data.number_of_positions,
        revision_limit=sprint_data.revision_limit,
        deadline=sprint_data.deadline,
        application_deadline=sprint_data.application_deadline,
        status="DRAFT",
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def publish_sprint(db: Session, sprint_id: UUID) -> Sprint:
    sprint = db.scalar(
        select(Sprint)
        .where(Sprint.id == sprint_id)
        .with_for_update()
    )
    if sprint is None:
        raise LookupError("Sprint not found")
    if sprint.status != "DRAFT":
        raise ValueError("Only DRAFT sprints can be published")

    payment = db.scalar(
        select(Payment).where(Payment.sprint_id == sprint.id)
    )
    if payment is not None and (
        payment.sprint_id != sprint.id
        or payment.payer_id != sprint.employer_id
        or payment.application_id is not None
        or payment.payee_id is not None
        or payment.amount != sprint.budget
        or payment.currency != sprint.currency
        or payment.payment_type != PaymentType.DEPOSIT.value
        or payment.status != PaymentStatus.HELD.value
        or not payment.is_simulated
        or payment.transaction_reference is not None
        or payment.completed_at is not None
    ):
        raise ValueError("Sprint has an inconsistent Payment state")

    try:
        if payment is None:
            now = datetime.now(timezone.utc)
            payment = Payment(
                sprint_id=sprint.id,
                application_id=None,
                payer_id=sprint.employer_id,
                payee_id=None,
                amount=sprint.budget,
                currency=sprint.currency,
                payment_type=PaymentType.DEPOSIT.value,
                status=PaymentStatus.HELD.value,
                is_simulated=True,
                transaction_reference=None,
                created_at=now,
                completed_at=None,
            )
            db.add(payment)
        sprint.status = "PUBLISHED"
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(sprint)
    return sprint


def get_published_sprints(db: Session) -> list[Sprint]:
    statement = select(Sprint).where(Sprint.status == "PUBLISHED")
    return list(db.scalars(statement).all())


def get_sprint_by_id(db: Session, sprint_id: UUID) -> Sprint:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    return sprint
