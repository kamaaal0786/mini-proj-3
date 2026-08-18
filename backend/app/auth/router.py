"""
Authentication router.
POST /api/auth/login  — returns JWT + role
GET  /api/me          — returns current user profile (SDK Section 5)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.db.base import get_db
from app.db.models import User
from app.schemas.auth import TokenResponse, UserMeResponse
from app.auth.dependencies import create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
# Second router for /api/me (no auth prefix, per SDK Section 5)
me_router = APIRouter(prefix="/api", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/login", response_model=TokenResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Authenticate with email (username field) + password.
    Returns a Bearer JWT containing the user's role.
    """
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status.value == "inactive":
        raise HTTPException(status_code=403, detail="Account is inactive")

    from app.db.models import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
    student_id = profile.student_id if profile else None

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        role=user.role.value,
        user_id=user.id,
        name=user.name,
        student_id=student_id,
    )


@router.get("/me", response_model=UserMeResponse)
def get_me_auth(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the profile of the currently authenticated user (via /api/auth/me)."""
    from app.db.models import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    current_user._student_id = profile.student_id if profile else None
    return current_user


@me_router.get("/me", response_model=UserMeResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the profile at /api/me as per SDK Section 5 API contract."""
    from app.db.models import StudentProfile
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    current_user._student_id = profile.student_id if profile else None
    return current_user
