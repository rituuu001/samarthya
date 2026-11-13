from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate


def create_sprint(
    db: Session,
    sprint_data: SprintCreate,
    employer_id: int,
) -> Sprint:
    sprint = Sprint(
        employer_id=employer_id,
        title=sprint_data.title,
        description=sprint_data.description,
        skill=sprint_data.skill,
        difficulty=sprint_data.difficulty,
        payment_amount=sprint_data.payment_amount,
        deadline=sprint_data.deadline,
        status="DRAFT",
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def publish_sprint(db: Session, sprint_id: int) -> Sprint:
    sprint = get_sprint_by_id(db, sprint_id)
    if sprint.status != "DRAFT":
        raise ValueError("Only DRAFT sprints can be published")

    sprint.status = "PUBLISHED"
    db.commit()
    db.refresh(sprint)
    return sprint


def get_published_sprints(db: Session) -> list[Sprint]:
    statement = select(Sprint).where(Sprint.status == "PUBLISHED")
    return list(db.scalars(statement).all())


def get_sprint_by_id(db: Session, sprint_id: int) -> Sprint:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    return sprint
