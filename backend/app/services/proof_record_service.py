from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.proof_record import ProofRecord
from app.models.user import User


def get_my_proof_records(db: Session, current_user: User) -> list[ProofRecord]:
    statement = (
        select(ProofRecord)
        .where(ProofRecord.owner_id == current_user.id)
        .order_by(
            ProofRecord.created_at.desc().nullslast(),
            ProofRecord.id.desc(),
        )
    )
    return list(db.scalars(statement).all())


def _get_owned_proof_record(
    db: Session, proof_record_id: UUID, user_id: UUID
) -> ProofRecord:
    proof_record = db.get(ProofRecord, proof_record_id)
    if proof_record is None:
        raise LookupError("Proof record not found")
    if proof_record.owner_id != user_id:
        raise PermissionError("You can only manage your own proof records")
    return proof_record


def update_proof_record_sharing(
    db: Session, proof_record_id: UUID, user_id: UUID, is_shared: bool
) -> ProofRecord:
    proof_record = _get_owned_proof_record(db, proof_record_id, user_id)
    proof_record.is_shared = is_shared
    db.commit()
    db.refresh(proof_record)
    return proof_record
