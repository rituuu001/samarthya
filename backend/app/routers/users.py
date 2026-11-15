from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schemas.portfolio_project import PortfolioProjectResponse
from app.schemas.profile import UserProfileUpdate, UserProfileResponse
from app.services import portfolio_project_service


router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/{user_id}/portfolio-projects",
    response_model=list[PortfolioProjectResponse],
)
def get_user_portfolio_projects(
    user_id: UUID,
    db: Session = Depends(get_db),
) -> list[PortfolioProjectResponse]:
    try:
        return portfolio_project_service.get_public_projects_for_user(db, user_id)
    except LookupError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "full_name": profile.full_name,
        "bio": profile.bio,
        "location": profile.location,
        "skills": profile.skills,
        "education": profile.education,
        "organization_name": profile.organization_name,
        "website": profile.website,
    }


@router.patch("/me", response_model=UserProfileResponse)
def update_my_profile(
    updates: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.user_id == current_user.id)
        .first()
    )

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found",
        )

    update_data = updates.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No profile fields provided",
        )

    if "full_name" in update_data:
        if update_data["full_name"] is None or not update_data["full_name"].strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Full name cannot be empty",
            )

        update_data["full_name"] = update_data["full_name"].strip()

    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)

    return {
        "id": str(profile.id),
        "user_id": str(profile.user_id),
        "full_name": profile.full_name,
        "bio": profile.bio,
        "location": profile.location,
        "skills": profile.skills,
        "education": profile.education,
        "organization_name": profile.organization_name,
        "website": profile.website,
    }