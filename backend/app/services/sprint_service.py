from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.employer_payment_account import EmployerPaymentAccount
from app.models.payment import Payment, PaymentStatus, PaymentType
from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate
from app.services.assessment_service import assign_assessment_to_sprint
from app.models.user_profile import UserProfile
from app.models.file_asset import FileAsset

def _populate_attachment_metadata(db: Session, sprint: Sprint) -> Sprint:
    file_ids = sprint.attachment_file_ids or []
    if not file_ids:
        sprint.attachments = []
        return sprint

    assets = list(
        db.scalars(select(FileAsset).where(FileAsset.id.in_([UUID(fid) for fid in file_ids]))).all()
    )
    assets_by_id = {str(asset.id): asset for asset in assets}
    missing = [fid for fid in file_ids if str(fid) not in assets_by_id]
    if missing:
        raise ValueError(f"Attachment file(s) not found: {', '.join(missing)}")
    sprint.attachments = [
        {
            "id": assets_by_id[str(file_id)].id,
            "original_filename": assets_by_id[str(file_id)].original_filename,
            "mime_type": assets_by_id[str(file_id)].mime_type,
            "file_size": assets_by_id[str(file_id)].file_size,
        }
        for file_id in file_ids
    ]
    return sprint


def create_sprint(
    db: Session,
    sprint_data: SprintCreate,
    employer_id: UUID,
) -> Sprint:
    attachment_ids = list(sprint_data.attachment_file_ids)
    if len(set(attachment_ids)) != len(attachment_ids):
        raise ValueError("Duplicate attachment file IDs are not allowed")

    if attachment_ids:
        assets = list(db.scalars(select(FileAsset).where(FileAsset.id.in_(attachment_ids))).all())
        assets_by_id = {asset.id: asset for asset in assets}
        for attachment_id in attachment_ids:
            asset = assets_by_id.get(attachment_id)
            if asset is None:
                raise LookupError(f"Attachment file {attachment_id} not found")
            if asset.purpose != "SPRINT_ATTACHMENT":
                raise ValueError(f"File {attachment_id} is not a Sprint attachment")
            if asset.uploaded_by != employer_id:
                raise PermissionError("Sprint attachments must be uploaded by the Sprint employer")

    sprint = Sprint(
        employer_id=employer_id,
        title=sprint_data.title,
        description=sprint_data.description,
        assessment_category=sprint_data.assessment_category,
        skill_category=sprint_data.skill_category,
        difficulty=sprint_data.difficulty,
        task_type=sprint_data.task_type,
        budget=sprint_data.budget,
        currency=sprint_data.currency,
        number_of_positions=sprint_data.number_of_positions,
        revision_limit=sprint_data.revision_limit,
        deadline=sprint_data.deadline,
        application_deadline=sprint_data.application_deadline,
        attachment_file_ids=[str(file_id) for file_id in sprint_data.attachment_file_ids],
        external_links=[
            {"url": str(link.url), "title": link.title}
            for link in sprint_data.external_links
        ],
        status="DRAFT",
    )
    db.add(sprint)
    try:
        db.flush()
        assign_assessment_to_sprint(db, sprint)
        db.commit()
    except Exception:
        db.rollback()
        raise
    db.refresh(sprint)
    return _populate_attachment_metadata(db, sprint)


def publish_sprint(
    db: Session,
    sprint_id: UUID,
    employer_id: UUID,
    payment_method: str | None = None,
    source_identifier: str | None = None,
    payment_account_id: UUID | None = None,
) -> Sprint:
    sprint = db.scalar(
        select(Sprint)
        .where(Sprint.id == sprint_id)
        .with_for_update()
    )
    if sprint is None:
        raise LookupError("Sprint not found")

    if sprint.employer_id != employer_id:
        raise PermissionError("You do not own this Sprint")

    if sprint.status != "DRAFT":
        raise ValueError("Only DRAFT sprints can be published")

    if payment_account_id is not None:
        payment_account = db.scalar(
            select(EmployerPaymentAccount)
            .where(
                EmployerPaymentAccount.id == payment_account_id,
                EmployerPaymentAccount.employer_id == employer_id,
            )
            .with_for_update()
        )
        if payment_account is None:
            raise LookupError("Payment account not found")
    else:
        payment_account = db.scalar(
            select(EmployerPaymentAccount)
            .where(
                EmployerPaymentAccount.employer_id == employer_id,
                EmployerPaymentAccount.is_default.is_(True),
            )
            .with_for_update()
        )
        if payment_account is None:
            raise ValueError(
                "A default payment account is required to publish a Sprint"
            )

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
                payment_method=payment_method,
                source_identifier=source_identifier,
                created_at=now,
                completed_at=None,
            )
            db.add(payment)
        sprint.payment_account_id = payment_account.id
        sprint.status = "PUBLISHED"
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(sprint)
    return _populate_attachment_metadata(db, sprint)


def get_published_sprints(db: Session):
    statement = (
        select(Sprint, UserProfile.organization_name)
        .outerjoin(UserProfile, Sprint.employer_id == UserProfile.user_id)
        .where(Sprint.status == "PUBLISHED")
    )

    results = db.execute(statement).all()

    return [
        {
            **{
                column.name: getattr(sprint, column.name)
                for column in Sprint.__table__.columns
            },
            "attachments": _populate_attachment_metadata(db, sprint).attachments,
            "organization_name": organization_name,
        }
        for sprint, organization_name in results
    ]


def get_employer_sprints(db: Session, employer_id: UUID) -> list[Sprint]:
    statement = (
        select(Sprint)
        .where(Sprint.employer_id == employer_id)
        .order_by(Sprint.created_at.desc())
    )
    sprints = list(db.scalars(statement).all())
    return [_populate_attachment_metadata(db, sprint) for sprint in sprints]


def get_sprint_by_id(
    db: Session,
    sprint_id: UUID,
    current_user: User | None = None,
) -> Sprint:
    sprint = db.get(Sprint, sprint_id)

    if sprint is None:
        raise LookupError("Sprint not found")

    if sprint.status == "PUBLISHED":
        return _populate_attachment_metadata(db, sprint)

    if (
        sprint.status == "DRAFT"
        and current_user is not None
        and current_user.role == UserRole.EMPLOYER
        and sprint.employer_id == current_user.id
    ):
        return _populate_attachment_metadata(db, sprint)

    raise LookupError("Sprint not found")
