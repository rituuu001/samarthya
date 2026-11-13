from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.sprint import Sprint
from app.schemas.sprint import SprintCreate


def create_sprint(
    db: Session,
    sprint_data: SprintCreate,
    employer_id: UUID,
) -> Sprint:
    sprint = Sprint(
        employer_id=employer_id,
        title=sprint_data.title,
        description=sprint_data.description,
        skill_category=sprint_data.skill_category,
        difficulty=sprint_data.difficulty,
        task_type=sprint_data.task_type,
        budget=sprint_data.budget,
        currency=sprint_data.currency,
        number_of_positions=sprint_data.number_of_positions,
        revision_limit=sprint_data.revision_limit,
        deadline=sprint_data.deadline,
        application_deadline=sprint_data.application_deadline,
        status="DRAFT",
    )
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return sprint


def publish_sprint(db: Session, sprint_id: UUID) -> Sprint:
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


def get_sprint_by_id(db: Session, sprint_id: UUID) -> Sprint:
    sprint = db.get(Sprint, sprint_id)
    if sprint is None:
        raise LookupError("Sprint not found")
    return sprint
