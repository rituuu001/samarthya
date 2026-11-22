from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.application import Application, ApplicationStatus
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.sprint import Sprint
from app.models.user import User, UserRole
from app.models.proof_record import ProofRecord
from app.models.portfolio_project import PortfolioProject
from app.services import assessment_service


def _require_user(db: Session, user_id: UUID, role: UserRole) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise LookupError("User not found")
    if user.role != role or not user.is_active:
        raise PermissionError(f"An active {role.value.lower()} account is required")
    return user


def _get_application(db: Session, application_id: UUID) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise LookupError("Application not found")
    return application


def _get_application_for_employer(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> tuple[Application, Sprint]:
    _require_user(db, employer_id, UserRole.EMPLOYER)
    application = _get_application(db, application_id)
    sprint = db.get(Sprint, application.sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    if sprint.employer_id != employer_id:
        raise PermissionError("Only the Sprint's employer can manage applications")
    return application, sprint


def _commit_or_raise_conflict(
    db: Session,
    constraint_name: str,
    message: str,
) -> None:
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        actual_constraint = getattr(
            getattr(error.orig, "diag", None),
            "constraint_name",
            None,
        )
        if actual_constraint == constraint_name:
            raise ValueError(message) from error
        raise


def apply_to_sprint(
    db: Session,
    sprint_id: UUID,
    applicant_id: UUID,
) -> Application:
    _require_user(db, applicant_id, UserRole.CONTRIBUTOR)
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")

    now = datetime.now(timezone.utc)
    if sprint.status != "PUBLISHED":
        raise ValueError("Sprint is not accepting applications")
    if now >= sprint.application_deadline or now >= sprint.deadline:
        raise ValueError("Sprint application period has ended")

    existing = db.scalar(
        select(Application).where(
            Application.sprint_id == sprint_id,
            Application.applicant_id == applicant_id,
        )
    )
    if existing is not None:
        raise ValueError("You have already applied to this Sprint")

    application = Application(
        sprint_id=sprint_id,
        applicant_id=applicant_id,
        status=ApplicationStatus.APPLIED.value,
    )
    db.add(application)
    _commit_or_raise_conflict(
        db,
        "uq_applications_sprint_applicant",
        "You have already applied to this Sprint",
    )
    db.refresh(application)
    return application


def get_applicant_applications(
    db: Session,
    applicant_id: UUID,
) -> list[Application]:
    _require_user(db, applicant_id, UserRole.CONTRIBUTOR)
    statement = (
        select(Application)
        .where(Application.applicant_id == applicant_id)
        .order_by(Application.applied_at.desc())
    )
    return list(db.scalars(statement).all())


def get_sprint_applications(
    db: Session,
    sprint_id: UUID,
    employer_id: UUID,
) -> list[Application]:
    _require_user(db, employer_id, UserRole.EMPLOYER)
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    if sprint.employer_id != employer_id:
        raise PermissionError("Only the Sprint's employer can view applications")

    statement = (
        select(Application)
        .where(Application.sprint_id == sprint_id)
        .order_by(Application.applied_at.desc())
    )
    return list(db.scalars(statement).all())


def get_employer_sprint_applicant_counts(
    db: Session,
    employer_id: UUID,
) -> list[dict[str, UUID | int]]:
    _require_user(db, employer_id, UserRole.EMPLOYER)
    statement = (
        select(
            Sprint.id.label("sprint_id"),
            func.count(Application.id).label("total_applicants"),
            func.count(
                case(
                    (
                        Application.status == ApplicationStatus.SELECTED.value,
                        1,
                    )
                )
            ).label("selected_applicants"),
        )
        .outerjoin(Application, Application.sprint_id == Sprint.id)
        .where(Sprint.employer_id == employer_id)
        .group_by(Sprint.id)
        .order_by(Sprint.created_at.desc())
    )
    return [
        {
            "sprint_id": row.sprint_id,
            "total_applicants": row.total_applicants,
            "selected_applicants": row.selected_applicants,
        }
        for row in db.execute(statement)
    ]


def mark_assessment_submitted(
    db: Session,
    application_id: UUID,
    applicant_id: UUID,
) -> Application:
    _require_user(db, applicant_id, UserRole.CONTRIBUTOR)
    application = _get_application(db, application_id)
    if application.applicant_id != applicant_id:
        raise PermissionError("Applicants can only update their own application")
    if application.status != ApplicationStatus.APPLIED.value:
        raise ValueError("Only APPLIED applications can advance to assessment submitted")

    application.status = ApplicationStatus.ASSESSMENT_SUBMITTED.value
    db.commit()
    db.refresh(application)
    return application


def shortlist_application(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> Application:
    application, _ = _get_application_for_employer(
        db,
        application_id,
        employer_id,
    )
    if application.status != ApplicationStatus.ASSESSMENT_SUBMITTED.value:
        raise ValueError(
            "Only ASSESSMENT_SUBMITTED applications can be shortlisted"
        )

    application.status = ApplicationStatus.SHORTLISTED.value
    db.commit()
    db.refresh(application)
    return application


def select_application(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> Application:
    application, sprint = _get_application_for_employer(
        db,
        application_id,
        employer_id,
    )
    if application.status != ApplicationStatus.SHORTLISTED.value:
        raise ValueError("Only SHORTLISTED applications can be selected")

    locked_sprint = db.scalar(
        select(Sprint)
        .where(Sprint.id == sprint.id)
        .with_for_update()
    )
    if locked_sprint is None:
        raise LookupError("Sprint not found")

    selected_application = db.scalar(
        select(Application.id).where(
            Application.sprint_id == locked_sprint.id,
            Application.status == ApplicationStatus.SELECTED.value,
        )
    )
    if selected_application is not None:
        raise ValueError("This Sprint already has a selected applicant")

    payment = db.scalar(
        select(Payment).where(Payment.sprint_id == locked_sprint.id)
    )
    if payment is None:
        raise ValueError("This Sprint does not have a Payment")
    if payment.sprint_id != application.sprint_id:
        raise ValueError("Payment does not belong to the application's Sprint")
    if payment.payer_id != locked_sprint.employer_id:
        raise ValueError("Payment payer does not match the Sprint's employer")
    if (
        payment.payment_type != PaymentType.DEPOSIT.value
        or payment.status != PaymentStatus.HELD.value
    ):
        raise ValueError("Payment must be a HELD DEPOSIT before application selection")
    if payment.application_id is not None or payment.payee_id is not None:
        raise ValueError("Payment already has a selected application")

    try:
        application.status = ApplicationStatus.SELECTED.value
        payment.application_id = application.id
        payment.payee_id = application.applicant_id
        _commit_or_raise_conflict(
            db,
            "uq_applications_one_selected_per_sprint",
            "This Sprint already has a selected applicant",
        )
    except Exception:
        db.rollback()
        raise

    db.refresh(application)
    return application


def get_shared_evidence(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> tuple[list, list]:
    from app.models.portfolio_project import PortfolioProject
    from app.models.proof_record import ProofRecord
    from app.services import assessment_service
    from sqlalchemy import select

    application, _ = _get_application_for_employer(db, application_id, employer_id)

    attempt = assessment_service.get_completed_scored_attempt_for_application(
        db,
        application.id,
        application.sprint_id,
    )
    if attempt is None:
        raise ValueError("Assessment must be completed before accessing shared evidence")

    proof_records = list(
        db.scalars(
            select(ProofRecord).where(
                ProofRecord.owner_id == application.applicant_id,
                ProofRecord.is_shared.is_(True),
            )
        ).all()
    )
    projects = list(
        db.scalars(
            select(PortfolioProject).where(
                PortfolioProject.user_id == application.applicant_id,
                PortfolioProject.is_shared.is_(True),
            )
        ).all()
    )
    return proof_records, projects
