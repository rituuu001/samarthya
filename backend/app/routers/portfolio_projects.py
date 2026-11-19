from typing import NoReturn
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.portfolio_project import (
    PortfolioProjectCreate,
    PortfolioProjectResponse,
    PortfolioProjectUpdate,
)
from app.schemas.sharing import SharingUpdate
from app.services import portfolio_project_service


router = APIRouter(prefix="/portfolio-projects", tags=["portfolio-projects"])


def _raise_http_error(error: Exception) -> NoReturn:
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


@router.get(
    "/me",
    response_model=list[PortfolioProjectResponse],
)
def get_my_projects(
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> list[PortfolioProjectResponse]:
    return portfolio_project_service.get_contributor_projects(
        db,
        current_user.id,
    )


@router.post(
    "",
    response_model=PortfolioProjectResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    project_data: PortfolioProjectCreate,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> PortfolioProjectResponse:
    try:
        return portfolio_project_service.create_project(
            db,
            current_user.id,
            project_data,
        )
    except (LookupError, PermissionError) as error:
        _raise_http_error(error)


@router.put(
    "/{project_id}",
    response_model=PortfolioProjectResponse,
)
def update_project(
    project_id: UUID,
    project_data: PortfolioProjectUpdate,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> PortfolioProjectResponse:
    try:
        return portfolio_project_service.update_project(
            db,
            project_id,
            current_user.id,
            project_data,
        )
    except (LookupError, PermissionError) as error:
        _raise_http_error(error)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> Response:
    try:
        portfolio_project_service.delete_project(
            db,
            project_id,
            current_user.id,
        )
    except (LookupError, PermissionError) as error:
        _raise_http_error(error)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch(
    "/{project_id}/sharing",
    response_model=PortfolioProjectResponse,
)
def update_project_sharing(
    project_id: UUID,
    sharing_data: SharingUpdate,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> PortfolioProjectResponse:
    try:
        return portfolio_project_service.update_project_sharing(
            db,
            project_id,
            current_user.id,
            sharing_data.is_shared,
        )
    except (LookupError, PermissionError) as error:
        _raise_http_error(error)


@router.get(
    "/{project_id}",
    response_model=PortfolioProjectResponse,
)
def get_project(
    project_id: UUID,
    current_user: User = Depends(require_roles(UserRole.CONTRIBUTOR)),
    db: Session = Depends(get_db),
) -> PortfolioProjectResponse:
    try:
        return portfolio_project_service.get_project_by_id(
            db,
            project_id,
            current_user.id,
        )
    except (LookupError, PermissionError) as error:
        _raise_http_error(error)
