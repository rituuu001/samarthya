from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.payment import Payment
from app.models.sprint import Sprint
from app.models.user import User, UserRole


def get_my_payments(db: Session, current_user: User) -> list[tuple[Payment, str, UUID | None]]:
    statement = (
        select(Payment, Sprint.title, Application.applicant_id)
        .join(Sprint, Sprint.id == Payment.sprint_id)
        .outerjoin(Application, Application.id == Payment.application_id)
        .order_by(Payment.created_at.desc().nullslast(), Payment.id.desc())
    )
    if current_user.role == UserRole.EMPLOYER:
        statement = statement.where(Payment.payer_id == current_user.id)
    elif current_user.role == UserRole.CONTRIBUTOR:
        statement = statement.where(Payment.payee_id == current_user.id)
    else:
        statement = statement.where(
            or_(
                Payment.payer_id == current_user.id,
                Payment.payee_id == current_user.id,
            )
        )

    return [
        (payment, sprint_title, applicant_id)
        for payment, sprint_title, applicant_id in db.execute(statement).all()
    ]
