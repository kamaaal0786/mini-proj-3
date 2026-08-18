"""
Courses router — GET list, POST create, POST assign-faculty.
SDK Section 5: course catalog and faculty assignment.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.db.models import User, Course, StudentFaculty, UserRole
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix='/api/courses', tags=['courses'])
admin_only = require_role(UserRole.admin)


# ── Schemas ──────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    name: str
    code: str
    credits: int = 3
    semester: int = 1


class AssignFacultyRequest(BaseModel):
    faculty_id: int


class CourseResponse(BaseModel):
    course_id: int
    name: str
    code: str
    credits: int
    semester: int
    faculty_id: Optional[int] = None
    faculty_name: Optional[str] = None

    class Config:
        from_attributes = True


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get('', response_model=List[CourseResponse])
def list_courses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all courses. All authenticated roles can view."""
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


@router.post('', status_code=status.HTTP_201_CREATED)
def create_course(
    body: CourseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Create a new course. Admin only."""
    existing = db.query(Course).filter(Course.code == body.code).first()
    if existing:
        raise HTTPException(409, f'Course code {body.code!r} already exists')

    course = Course(
        name=body.name,
        code=body.code,
        credits=body.credits,
        semester=body.semester,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {
        'course_id': course.course_id,
        'name':      course.name,
        'code':      course.code,
        'credits':   course.credits,
        'semester':  course.semester,
        'faculty_id': None,
    }


@router.post('/{course_id}/assign-faculty', status_code=200)
def assign_faculty(
    course_id: int,
    body: AssignFacultyRequest,
    db: Session = Depends(get_db),
    _: User = Depends(admin_only),
):
    """Assign a faculty member to a course. Admin only."""
    course = db.query(Course).filter(Course.course_id == course_id).first()
    if not course:
        raise HTTPException(404, 'Course not found')

    faculty = db.query(User).filter(
        User.id == body.faculty_id,
        User.role == UserRole.faculty,
    ).first()
    if not faculty:
        raise HTTPException(404, 'Faculty not found')

    course.faculty_id = body.faculty_id
    db.commit()
    return {'message': f'{faculty.name} assigned to {course.name}'}
