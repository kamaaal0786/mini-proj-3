"""
Courses router — course catalog management and faculty assignment.
All authenticated roles can list courses; only admin can create/assign.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.db.base import get_db
from app.db.models import Course, User, UserRole
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/courses", tags=["courses"])
admin_only = require_role(UserRole.admin)


class CourseCreate(BaseModel):
    name: str
    code: str
    credits: int = 3
    semester: int = 1
    faculty_id: Optional[int] = None


class AssignFacultyRequest(BaseModel):
    faculty_id: int


@router.get("")
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all courses with faculty name. All authenticated roles."""
    courses = db.query(Course).order_by(Course.semester, Course.name).all()
    result = []
    for c in courses:
        faculty_name = None
        if c.faculty_id:
            fac = db.query(User).filter(User.id == c.faculty_id).first()
            faculty_name = fac.name if fac else None
        result.append({
            'course_id':    c.course_id,
            'name':         c.name,
            'code':         c.code,
            'credits':      c.credits,
            'semester':     c.semester,
            'faculty_id':   c.faculty_id,
            'faculty_name': faculty_name,
        })
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
def create_course(
    payload: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Create a course. Admin only."""
    existing = db.query(Course).filter(Course.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=409, detail="Course code already exists")
    course = Course(
        name=payload.name,
        code=payload.code,
        credits=payload.credits,
        semester=payload.semester,
        faculty_id=payload.faculty_id,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {
        'course_id':    course.course_id,
        'name':         course.name,
        'code':         course.code,
        'credits':      course.credits,
        'semester':     course.semester,
        'faculty_id':   course.faculty_id,
        'faculty_name': None,
    }


@router.post("/{course_id}/assign-faculty", status_code=200)
def assign_faculty_to_course(
    course_id: int,
    payload: AssignFacultyRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Assign a faculty member to a course. Admin only."""
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    faculty = db.query(User).filter(
        User.id == payload.faculty_id, User.role == UserRole.faculty
    ).first()
    if not faculty:
        raise HTTPException(status_code=404, detail="Faculty not found")
    course.faculty_id = payload.faculty_id
    db.commit()
    return {"message": f"Faculty {faculty.name} assigned to course {course.name}"}
