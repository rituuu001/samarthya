from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.employer_payment_account import (
    EmployerPaymentAccountCreate,
    EmployerPaymentAccountResponse,
    EmployerPaymentAccountUpdate,
)
from app.services import employer_payment_account_service
from app.services.employer_payment_account_service import (
    PaymentAccountConflictError,
)


router = APIRouter(
    prefix="/employer/payment-accounts",
    tags=["employer-payment-accounts"],
)


def _raise_http_error(error: Exception) -> NoReturn:
    if isinstance(error, LookupError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error
    if isinstance(error, PaymentAccountConflictError):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    raise error


@router.get("", response_model=list[EmployerPaymentAccountResponse])
def get_payment_accounts(
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> list[EmployerPaymentAccountResponse]:
    return employer_payment_account_service.get_payment_accounts(
        db,
        current_user.id,
    )


@router.post(
    "",
    response_model=EmployerPaymentAccountResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_account(
    account_data: EmployerPaymentAccountCreate,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> EmployerPaymentAccountResponse:
    try:
        return employer_payment_account_service.create_payment_account(
            db,
            current_user.id,
            account_data,
        )
    except (LookupError, PaymentAccountConflictError) as error:
        _raise_http_error(error)


@router.patch(
    "/{account_id}",
    response_model=EmployerPaymentAccountResponse,
)
def update_payment_account(
    account_id: UUID,
    account_data: EmployerPaymentAccountUpdate,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> EmployerPaymentAccountResponse:
    try:
        return employer_payment_account_service.update_payment_account(
            db,
            current_user.id,
            account_id,
            account_data,
        )
    except (LookupError, PaymentAccountConflictError) as error:
        _raise_http_error(error)


@router.delete(
    "/{account_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_payment_account(
    account_id: UUID,
    current_user: User = Depends(require_roles(UserRole.EMPLOYER)),
    db: Session = Depends(get_db),
) -> Response:
    try:
        employer_payment_account_service.delete_payment_account(
            db,
            current_user.id,
            account_id,
        )
    except (LookupError, PaymentAccountConflictError) as error:
        _raise_http_error(error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
