from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.portfolio_project import PortfolioProject
from app.models.user import User, UserRole
from app.schemas.portfolio_project import (
    PortfolioProjectCreate,
    PortfolioProjectUpdate,
)


def _require_contributor(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise LookupError("User not found")
    if user.role != UserRole.CONTRIBUTOR or not user.is_active:
        raise PermissionError("An active contributor account is required")
    return user


def _get_project(db: Session, project_id: UUID) -> PortfolioProject:
    project = db.get(PortfolioProject, project_id)
    if project is None:
        raise LookupError("Portfolio project not found")
    return project


def _get_owned_project(
    db: Session,
    project_id: UUID,
    user_id: UUID,
) -> PortfolioProject:
    project = _get_project(db, project_id)
    if project.user_id != user_id:
        raise PermissionError("Contributors can only manage their own projects")
    return project


def create_project(
    db: Session,
    user_id: UUID,
    project_data: PortfolioProjectCreate,
) -> PortfolioProject:
    _require_contributor(db, user_id)
    project = PortfolioProject(
        user_id=user_id,
        **project_data.model_dump(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def get_contributor_projects(
    db: Session,
    user_id: UUID,
) -> list[PortfolioProject]:
    _require_contributor(db, user_id)
    statement = (
        select(PortfolioProject)
        .where(PortfolioProject.user_id == user_id)
        .order_by(
            PortfolioProject.created_at.desc().nullslast(),
            PortfolioProject.id.desc(),
        )
    )
    return list(db.scalars(statement).all())


def get_public_projects_for_user(
    db: Session,
    user_id: UUID,
) -> list[PortfolioProject]:
    if db.get(User, user_id) is None:
        raise LookupError("User not found")

    statement = (
        select(PortfolioProject)
        .where(PortfolioProject.user_id == user_id)
        .order_by(
            PortfolioProject.created_at.desc().nullslast(),
            PortfolioProject.id.desc(),
        )
    )
    return list(db.scalars(statement).all())


def get_project_by_id(
    db: Session,
    project_id: UUID,
) -> PortfolioProject:
    return _get_project(db, project_id)


def update_project(
    db: Session,
    project_id: UUID,
    user_id: UUID,
    project_data: PortfolioProjectUpdate,
) -> PortfolioProject:
    _require_contributor(db, user_id)
    project = _get_owned_project(db, project_id, user_id)
    for field, value in project_data.model_dump().items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(
    db: Session,
    project_id: UUID,
    user_id: UUID,
) -> None:
    _require_contributor(db, user_id)
    project = _get_owned_project(db, project_id, user_id)
    db.delete(project)
    db.commit()
