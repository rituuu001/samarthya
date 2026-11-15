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
