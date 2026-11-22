from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.application import Application
from app.models.connection_request import (
    ConnectionRequest,
    ConnectionRequestStatus,
)
from app.models.sprint import Sprint
from app.models.user import UserRole
from app.models.user_profile import UserProfile
from app.services.application_service import (
    _commit_or_raise_conflict,
    _get_application,
    _get_application_for_employer,
    _require_user,
)
from app.services.assessment_service import (
    get_completed_scored_attempt_for_application,
)


def _get_connection_request_for_application(
    db: Session,
    application_id: UUID,
) -> ConnectionRequest:
    connection_request = db.scalar(
        select(ConnectionRequest).where(
            ConnectionRequest.application_id == application_id
        )
    )
    if connection_request is None:
        raise LookupError("Connection request not found")
    return connection_request


def create_connection_request(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> ConnectionRequest:
    application, sprint = _get_application_for_employer(
        db,
        application_id,
        employer_id,
    )
    if (
        get_completed_scored_attempt_for_application(
            db,
            application.id,
            sprint.id,
        )
        is None
    ):
        raise ValueError(
            "Connection requests require a completed and scored assessment"
        )

    existing_request = db.scalar(
        select(ConnectionRequest).where(
            ConnectionRequest.application_id == application_id
        )
    )
    if existing_request is not None:
        raise ValueError("A connection request already exists for this Application")

    connection_request = ConnectionRequest(
        application_id=application.id,
        status=ConnectionRequestStatus.PENDING.value,
    )
    db.add(connection_request)
    _commit_or_raise_conflict(
        db,
        "uq_connection_requests_application",
        "A connection request already exists for this Application",
    )
    db.refresh(connection_request)
    return connection_request


def get_connection_request_for_employer(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> ConnectionRequest:
    _get_application_for_employer(db, application_id, employer_id)
    return _get_connection_request_for_application(db, application_id)


def list_connection_requests_for_sprint(
    db: Session,
    sprint_id: UUID,
    employer_id: UUID,
) -> list[ConnectionRequest]:
    _require_user(db, employer_id, UserRole.EMPLOYER)
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    if sprint.employer_id != employer_id:
        raise PermissionError("Only the Sprint's employer can view connection requests")

    statement = (
        select(ConnectionRequest)
        .join(
            Application,
            Application.id == ConnectionRequest.application_id,
        )
        .where(Application.sprint_id == sprint_id)
        .order_by(ConnectionRequest.created_at.desc())
    )
    return list(db.scalars(statement).all())


def list_connection_requests_for_contributor(
    db: Session,
    contributor_id: UUID,
) -> list[ConnectionRequest]:
    _require_user(db, contributor_id, UserRole.CONTRIBUTOR)
    statement = (
        select(ConnectionRequest)
        .join(
            Application,
            Application.id == ConnectionRequest.application_id,
        )
        .where(Application.applicant_id == contributor_id)
        .order_by(ConnectionRequest.created_at.desc())
    )
    return list(db.scalars(statement).all())


def respond_to_connection_request(
    db: Session,
    request_id: UUID,
    contributor_id: UUID,
    accept: bool,
) -> ConnectionRequest:
    _require_user(db, contributor_id, UserRole.CONTRIBUTOR)
    statement = (
        select(ConnectionRequest)
        .where(ConnectionRequest.id == request_id)
        .with_for_update()
    )
    scalar = getattr(db, "scalar", None)
    if scalar is None:
        connection_request = db.get(ConnectionRequest, request_id)
    else:
        connection_request = scalar(statement)
    if connection_request is None:
        raise LookupError("Connection request not found")

    application = _get_application(db, connection_request.application_id)
    if application.applicant_id != contributor_id:
        raise PermissionError(
            "Contributors can only respond to their own connection requests"
        )
    if connection_request.status != ConnectionRequestStatus.PENDING.value:
        raise ValueError("Only PENDING connection requests can be answered")

    connection_request.status = (
        ConnectionRequestStatus.ACCEPTED.value
        if accept
        else ConnectionRequestStatus.REJECTED.value
    )
    connection_request.responded_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(connection_request)
    return connection_request


def get_revealed_identity(
    db: Session,
    application_id: UUID,
    employer_id: UUID,
) -> dict[str, Any]:
    application, _ = _get_application_for_employer(
        db,
        application_id,
        employer_id,
    )
    connection_request = _get_connection_request_for_application(
        db,
        application_id,
    )
    if connection_request.status != ConnectionRequestStatus.ACCEPTED.value:
        raise PermissionError(
            "Contributor identity is available only after accepting the connection request"
        )

    contributor = _require_user(
        db,
        application.applicant_id,
        UserRole.CONTRIBUTOR,
    )
    profile = db.scalar(
        select(UserProfile).where(
            UserProfile.user_id == application.applicant_id
        )
    )
    if profile is None:
        raise LookupError("Contributor profile not found")

    return {
        "connection_request": {
            "id": connection_request.id,
            "application_id": connection_request.application_id,
            "status": connection_request.status,
            "created_at": connection_request.created_at,
            "updated_at": connection_request.updated_at,
            "responded_at": connection_request.responded_at,
        },
        "contributor": {
            "user_id": contributor.id,
            "full_name": profile.full_name,
            "email": contributor.email,
            "profile_picture_id": profile.profile_picture_id,
        },
    }
