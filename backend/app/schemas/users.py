"""
Pydantic schemas for user management endpoints.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.models import UserRole, UserStatus


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole
    status: UserStatus = UserStatus.active


class UserUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[UserStatus] = None
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    status: str

    class Config:
        from_attributes = True


class AssignMentorRequest(BaseModel):
    mentor_id: Optional[int] = None


class AssignFacultyRequest(BaseModel):
    faculty_id: int
    course_id: int
