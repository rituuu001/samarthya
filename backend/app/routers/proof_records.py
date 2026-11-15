from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.proof_record import ProofRecordResponse
from app.services import proof_record_service


router = APIRouter(prefix="/proof-records", tags=["proof-records"])


@router.get("/me", response_model=list[ProofRecordResponse])
def get_my_proof_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProofRecordResponse]:
    return proof_record_service.get_my_proof_records(db, current_user)
