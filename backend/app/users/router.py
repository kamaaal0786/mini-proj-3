"""
User management router — admin-only.
Implements SDK Section 5 user management and assignment endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from typing import List

from app.db.base import get_db
from app.db.models import User, StudentProfile, Course, StudentFaculty, UserRole
from app.schemas.users import (
    UserCreate, UserUpdate, UserResponse,
    AssignMentorRequest, AssignFacultyRequest,
)
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/users", tags=["users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
admin_only = require_role(UserRole.admin)


@router.get("", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    role: str = None,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """List all users with optional role filter. Admin only."""
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.offset(skip).limit(limit).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Create a non-student user (admin/faculty/mentor). Admin only."""
    if payload.role == UserRole.student:
        raise HTTPException(
            status_code=400,
            detail="Use POST /api/students to create student accounts.",
        )
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=pwd_context.hash(payload.password),
        role=payload.role,
        status=payload.status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Get a single user by ID. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Update user name, status, or role. Admin only."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.name is not None:
        user.name = payload.name
    if payload.status is not None:
        user.status = payload.status
    if payload.role is not None:
        user.role = payload.role

    db.commit()
    db.refresh(user)
    return user


@router.post("/{student_id}/assign-mentor", status_code=200)
def assign_mentor(
    student_id: int,
    payload: AssignMentorRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Assign a mentor to a student. Admin only."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.student_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    mentor = db.query(User).filter(
        User.id == payload.mentor_id,
        User.role == UserRole.mentor,
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    profile.mentor_id = payload.mentor_id
    db.commit()
    return {"message": f"Mentor {mentor.name} assigned to student {student_id}"}


@router.patch("/{student_id}/assign-mentor", status_code=200)
def assign_mentor_patch(
    student_id: int,
    payload: AssignMentorRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """PATCH alias for assign-mentor (used by Assignments page)."""
    profile = db.query(StudentProfile).filter(
        StudentProfile.student_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")

    if payload.mentor_id is None:
        profile.mentor_id = None
        db.commit()
        return {"message": f"Mentor unassigned from student {student_id}"}

    mentor = db.query(User).filter(
        User.id == payload.mentor_id,
        User.role == UserRole.mentor,
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    profile.mentor_id = payload.mentor_id
    db.commit()
    return {"message": f"Mentor {mentor.name} assigned to student {student_id}"}


# ── Faculty Assignment to Student ───────────────────────────────────────────

class AssignFacultyStudentRequest(BaseModel):
    faculty_id: int
    course_id: int


@router.post("/{student_id}/assign-faculty", status_code=200)
def assign_faculty_to_student(
    student_id: int,
    payload: AssignFacultyStudentRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Link a student to a faculty member for a specific course. Admin only."""
    from app.db.models import StudentFaculty, Course

    profile = db.query(StudentProfile).filter(
        StudentProfile.student_id == student_id
    ).first()
    if not profile:
        raise HTTPException(404, "Student not found")

    faculty = db.query(User).filter(
        User.id == payload.faculty_id, User.role == UserRole.faculty
    ).first()
    if not faculty:
        raise HTTPException(404, "Faculty not found")

    course = db.query(Course).filter(Course.course_id == payload.course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")

    existing = db.query(StudentFaculty).filter(
        StudentFaculty.student_id == student_id,
        StudentFaculty.faculty_id == payload.faculty_id,
        StudentFaculty.course_id == payload.course_id,
    ).first()
    if existing:
        return {"message": "Already assigned"}

    db.add(StudentFaculty(
        student_id=student_id,
        faculty_id=payload.faculty_id,
        course_id=payload.course_id,
    ))
    db.commit()
    return {"message": f"{faculty.name} assigned to {profile.roll_no} for {course.name}"}


@router.get("/{student_id}/faculty-assignments", status_code=200)
def get_student_faculty_assignments(
    student_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """List all faculty-course assignments for a student. Admin only."""
    from app.db.models import StudentFaculty, Course

    rows = db.query(StudentFaculty).filter(
        StudentFaculty.student_id == student_id
    ).all()
    result = []
    for r in rows:
        fac = db.query(User).filter(User.id == r.faculty_id).first()
        course = db.query(Course).filter(Course.course_id == r.course_id).first()
        result.append({
            "faculty_id":   r.faculty_id,
            "faculty_name": fac.name if fac else None,
            "course_id":    r.course_id,
            "course_name":  course.name if course else None,
            "course_code":  course.code if course else None,
        })
    return result
