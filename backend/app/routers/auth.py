from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.models.user_profile import UserProfile
from app.schemas.auth import UserRegister, UserResponse, UserLogin, TokenResponse
from app.core.security import hash_password, verify_password
from app.core.token import create_access_token
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
):
    email = str(user_data.email).strip().lower()

    existing_user = db.query(User).filter(User.email == email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        )

    try:
        new_user = User(
            email=email,
            password_hash=hash_password(user_data.password),
            role=UserRole(user_data.role),
        )

        db.add(new_user)
        db.flush()

        new_profile = UserProfile(
            user_id=new_user.id,
            full_name=user_data.full_name.strip(),
        )

        db.add(new_profile)
        db.commit()
        db.refresh(new_user)

        return UserResponse(
            id=str(new_user.id),
            email=new_user.email,
            full_name=new_profile.full_name,
            role=new_user.role.value,
        )

    except Exception:
        db.rollback()
        raise

@router.post("/login", response_model=TokenResponse)
def login_user(
    user_data: UserLogin,
    db: Session = Depends(get_db),
):
    email = str(user_data.email).strip().lower()

    user = db.query(User).filter(User.email == email).first()

    if not user or not verify_password(
        user_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    access_token = create_access_token(str(user.id))

    return TokenResponse(access_token=access_token)

@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = db.query(UserProfile).filter(
        UserProfile.user_id == current_user.id
    ).first()

    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found",
        )

    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=profile.full_name,
        role=current_user.role.value,
    )