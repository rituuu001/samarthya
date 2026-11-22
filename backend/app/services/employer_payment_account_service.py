from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.employer_payment_account import EmployerPaymentAccount
from app.models.user import User
from app.schemas.employer_payment_account import (
    EmployerPaymentAccountCreate,
    EmployerPaymentAccountUpdate,
)


class PaymentAccountConflictError(Exception):
    pass


def _lock_employer(db: Session, employer_id: UUID) -> None:
    employer = db.scalar(
        select(User).where(User.id == employer_id).with_for_update()
    )
    if employer is None:
        raise LookupError("Employer not found")


def get_payment_accounts(
    db: Session,
    employer_id: UUID,
) -> list[EmployerPaymentAccount]:
    statement = (
        select(EmployerPaymentAccount)
        .where(EmployerPaymentAccount.employer_id == employer_id)
        .order_by(
            EmployerPaymentAccount.is_default.desc(),
            EmployerPaymentAccount.created_at,
            EmployerPaymentAccount.id,
        )
    )
    return list(db.scalars(statement).all())


def create_payment_account(
    db: Session,
    employer_id: UUID,
    account_data: EmployerPaymentAccountCreate,
) -> EmployerPaymentAccount:
    try:
        _lock_employer(db, employer_id)
        accounts = list(
            db.scalars(
                select(EmployerPaymentAccount)
                .where(EmployerPaymentAccount.employer_id == employer_id)
                .with_for_update()
            ).all()
        )
        is_default = not accounts or account_data.is_default
        if is_default:
            for account in accounts:
                if account.is_default:
                    account.is_default = False
            db.flush()

        account = EmployerPaymentAccount(
            employer_id=employer_id,
            account_type=account_data.account_type,
            account_identifier=account_data.account_identifier,
            is_default=is_default,
        )
        db.add(account)
        db.commit()
        db.refresh(account)
        return account
    except Exception:
        db.rollback()
        raise


def update_payment_account(
    db: Session,
    employer_id: UUID,
    account_id: UUID,
    account_data: EmployerPaymentAccountUpdate,
) -> EmployerPaymentAccount:
    try:
        _lock_employer(db, employer_id)
        account = db.scalar(
            select(EmployerPaymentAccount)
            .where(
                EmployerPaymentAccount.id == account_id,
                EmployerPaymentAccount.employer_id == employer_id,
            )
            .with_for_update()
        )
        if account is None:
            raise LookupError("Payment account not found")

        changes = account_data.model_dump(exclude_unset=True)
        if changes.get("is_default") is False and account.is_default:
            another_default_id = db.scalar(
                select(EmployerPaymentAccount.id)
                .where(
                    EmployerPaymentAccount.employer_id == employer_id,
                    EmployerPaymentAccount.is_default.is_(True),
                    EmployerPaymentAccount.id != account_id,
                )
                .with_for_update()
            )
            if another_default_id is None:
                raise PaymentAccountConflictError(
                    "Set another payment account as default before unsetting this one."
                )

        for field in ("account_type", "account_identifier"):
            if field in changes:
                setattr(account, field, changes[field])

        if changes.get("is_default") is True:
            defaults = list(
                db.scalars(
                    select(EmployerPaymentAccount)
                    .where(
                        EmployerPaymentAccount.employer_id == employer_id,
                        EmployerPaymentAccount.is_default.is_(True),
                        EmployerPaymentAccount.id != account_id,
                    )
                    .with_for_update()
                ).all()
            )
            for current_default in defaults:
                current_default.is_default = False
            db.flush()

        if "is_default" in changes:
            account.is_default = changes["is_default"]

        db.commit()
        db.refresh(account)
        return account
    except Exception:
        db.rollback()
        raise


def delete_payment_account(
    db: Session,
    employer_id: UUID,
    account_id: UUID,
) -> None:
    try:
        _lock_employer(db, employer_id)
        accounts = list(
            db.scalars(
                select(EmployerPaymentAccount)
                .where(EmployerPaymentAccount.employer_id == employer_id)
                .with_for_update()
            ).all()
        )
        account = next(
            (item for item in accounts if item.id == account_id),
            None,
        )
        if account is None:
            raise LookupError("Payment account not found")
        if len(accounts) == 1:
            raise PaymentAccountConflictError(
                "The employer's only payment account cannot be deleted; "
                "add another account and make it default first."
            )
        if account.is_default:
            raise PaymentAccountConflictError(
                "Set another payment account as default before deleting this one."
            )

        db.delete(account)
        db.commit()
    except Exception:
        db.rollback()
        raise
