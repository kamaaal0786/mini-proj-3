"""
Pydantic schemas for authentication endpoints.
"""
from typing import Optional
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    name: str
    student_id: Optional[int] = None   # populated for students only


class UserMeResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    status: str

    class Config:
        from_attributes = True
