from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from app.core.dependencies import get_current_user
from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.verification import (
    Verification,
    VerificationType,
    VerificationStatus,
)
from app.models.file_asset import FileAsset
from app.schemas.verification import (
    VerificationCreate,
    VerificationReview,
    VerificationResponse,
)


router = APIRouter(prefix="/verifications", tags=["Verifications"])


@router.post(
    "",
    response_model=VerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_verification(
    data: VerificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    verification_type = VerificationType[data.verification_type]

    if (
        verification_type == VerificationType.BUSINESS
        and current_user.role != UserRole.EMPLOYER
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can request business verification",
        )

    evidence = (
        db.query(FileAsset)
        .filter(
            FileAsset.id == data.evidence_file_id,
            FileAsset.uploaded_by == current_user.id,
        )
        .first()
    )

    if evidence is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence file not found",
        )

    existing = (
        db.query(Verification)
        .filter(
            Verification.user_id == current_user.id,
            Verification.verification_type == verification_type,
            Verification.status == VerificationStatus.PENDING,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A pending request of this type already exists",
        )

    verification = Verification(
        user_id=current_user.id,
        verification_type=verification_type,
        status=VerificationStatus.PENDING,
        evidence_file_id=data.evidence_file_id,
    )

    db.add(verification)
    db.commit()
    db.refresh(verification)

    return verification


@router.get("/me", response_model=list[VerificationResponse])
def get_my_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Verification)
        .filter(Verification.user_id == current_user.id)
        .order_by(Verification.created_at.desc())
        .all()
    )


@router.patch(
    "/{verification_id}/review",
    response_model=VerificationResponse,
)
def review_verification(
    verification_id: UUID,
    data: VerificationReview,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
    db: Session = Depends(get_db),
):
    verification = (
        db.query(Verification)
        .filter(Verification.id == verification_id)
        .first()
    )

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification request not found",
        )

    if verification.status != VerificationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This verification request has already been reviewed",
        )

    if data.status == "REJECTED" and not (
        data.review_reason and data.review_reason.strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A rejection reason is required",
        )

    verification.status = VerificationStatus[data.status]
    verification.reviewed_by = current_user.id
    verification.review_reason = (
        data.review_reason.strip() if data.review_reason else None
    )

    db.commit()
    db.refresh(verification)

    return verification