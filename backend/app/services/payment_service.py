from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.sprint import Sprint
from app.models.user import User, UserRole


def get_my_payments(db: Session, current_user: User) -> list[tuple[Payment, str]]:
    statement = (
        select(Payment, Sprint.title)
        .join(Sprint, Sprint.id == Payment.sprint_id)
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
        (payment, sprint_title)
        for payment, sprint_title in db.execute(statement).all()
    ]
