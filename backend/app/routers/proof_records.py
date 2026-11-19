from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.core.dependencies import get_current_user
from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.proof_record import ProofRecordResponse
from app.schemas.sharing import SharingUpdate
from app.services import proof_record_service


router = APIRouter(prefix="/proof-records", tags=["proof-records"])


@router.get("/me", response_model=list[ProofRecordResponse])
def get_my_proof_records(
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> list[ProofRecordResponse]:
    return proof_record_service.get_my_proof_records(db, current_user)


@router.patch(
    "/{proof_record_id}/sharing",
    response_model=ProofRecordResponse,
)
def update_proof_record_sharing(
    proof_record_id: UUID,
    sharing_data: SharingUpdate,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> ProofRecordResponse:
    try:
        return proof_record_service.update_proof_record_sharing(
            db,
            proof_record_id,
            current_user.id,
            sharing_data.is_shared,
        )
    except (LookupError, PermissionError) as error:
        if isinstance(error, LookupError):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(error),
            ) from error
        if isinstance(error, PermissionError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(error),
            ) from error
        raise error
