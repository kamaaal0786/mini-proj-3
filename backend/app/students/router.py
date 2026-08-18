"""
Students router — role-filtered list/detail + admin creation.
SDK Section 5: GET /api/students, GET /api/students/{id}, POST /api/students
SDK Section 14: Least-privilege rules enforced at query level.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from passlib.context import CryptContext
from typing import List

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, StudentFaculty, UserRole, RiskHistory
)
from app.schemas.students import StudentCreate, StudentDetailResponse, StudentListItem
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/students", tags=["students"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_latest_risk_level(student_id: int, db: Session) -> str | None:
    """Fetch the most recent risk level for a student."""
    from sqlalchemy import desc as _desc
    row = (
        db.query(RiskHistory)
        .filter(RiskHistory.student_id == student_id)
        .order_by(_desc(RiskHistory.calculated_at))
        .first()
    )
    return row.risk_level.value.upper() if row else None


def _build_student_detail(user: User, profile: StudentProfile, db: Session = None) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role.value,
        "status": user.status.value,
        "student_id": profile.student_id,
        "roll_no": profile.roll_no,
        "program": profile.program,
        "semester": profile.semester,
        "mentor_id": profile.mentor_id,
        "is_demo": profile.is_demo,
        "latest_risk_level": _get_latest_risk_level(profile.student_id, db) if db else None,
    }


@router.get("", response_model=List[StudentDetailResponse])
def list_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Role-filtered student list (SDK Section 14):
    - admin  → all students
    - faculty → students assigned to this faculty in StudentFaculty
    - mentor → students whose mentor_id == current_user.id
    - student → only themselves
    """
    role = current_user.role

    if role == UserRole.admin:
        profiles = (
            db.query(StudentProfile)
            .options(joinedload(StudentProfile.user))
            .offset(skip).limit(limit).all()
        )
    elif role == UserRole.faculty:
        # Students in any course taught by this faculty
        student_ids = (
            db.query(StudentFaculty.student_id)
            .filter(StudentFaculty.faculty_id == current_user.id)
            .distinct()
            .all()
        )
        ids = [r[0] for r in student_ids]
        profiles = (
            db.query(StudentProfile)
            .options(joinedload(StudentProfile.user))
            .filter(StudentProfile.student_id.in_(ids))
            .all()
        )
    elif role == UserRole.mentor:
        profiles = (
            db.query(StudentProfile)
            .options(joinedload(StudentProfile.user))
            .filter(StudentProfile.mentor_id == current_user.id)
            .all()
        )
    else:
        # Student: only self
        profiles = (
            db.query(StudentProfile)
            .options(joinedload(StudentProfile.user))
            .filter(StudentProfile.user_id == current_user.id)
            .all()
        )

    result = []
    for profile in profiles:
        if profile.user:
            result.append(_build_student_detail(profile.user, profile, db))
    return result


@router.get("/{student_id}", response_model=StudentDetailResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a single student's detail.
    Enforces least-privilege: students can only fetch their own record.
    """
    profile = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user))
        .filter(StudentProfile.student_id == student_id)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    role = current_user.role

    # Enforce access control
    if role == UserRole.student:
        if profile.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif role == UserRole.mentor:
        if profile.mentor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif role == UserRole.faculty:
        assigned = (
            db.query(StudentFaculty)
            .filter(
                StudentFaculty.student_id == student_id,
                StudentFaculty.faculty_id == current_user.id,
            )
            .first()
        )
        if not assigned:
            raise HTTPException(status_code=403, detail="Access denied")
    # admin: always allowed

    return _build_student_detail(profile.user, profile, db)


@router.post("", response_model=StudentDetailResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Create a new student (User + StudentProfile). Admin only."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    roll_exists = db.query(StudentProfile).filter(
        StudentProfile.roll_no == payload.roll_no
    ).first()
    if roll_exists:
        raise HTTPException(status_code=409, detail="Roll number already exists")

    if payload.mentor_id:
        mentor = db.query(User).filter(
            User.id == payload.mentor_id, User.role == UserRole.mentor
        ).first()
        if not mentor:
            raise HTTPException(status_code=404, detail="Mentor not found")

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=pwd_context.hash(payload.password),
        role=UserRole.student,
        status="active",
    )
    db.add(user)
    db.flush()  # get user.id

    profile = StudentProfile(
        user_id=user.id,
        roll_no=payload.roll_no,
        program=payload.program,
        semester=payload.semester,
        mentor_id=payload.mentor_id,
        is_demo=payload.is_demo,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    db.refresh(user)

    return _build_student_detail(user, profile, db)
