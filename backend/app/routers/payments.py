from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.payment import PaymentHistoryResponse
from app.services import payment_service


router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/me", response_model=list[PaymentHistoryResponse])
def get_my_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentHistoryResponse]:
    return [
        PaymentHistoryResponse(
            id=payment.id,
            sprint_id=payment.sprint_id,
            sprint_title=sprint_title,
            application_id=payment.application_id,
            amount=payment.amount,
            currency=payment.currency,
            payment_type=payment.payment_type,
            status=payment.status,
            is_simulated=payment.is_simulated,
            transaction_reference=payment.transaction_reference,
            created_at=payment.created_at,
            completed_at=payment.completed_at,
        )
        for payment, sprint_title in payment_service.get_my_payments(
            db,
            current_user,
        )
    ]
