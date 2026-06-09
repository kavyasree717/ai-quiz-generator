"""Auth & user profile schemas."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    full_name: str = ""
    role: str = "student"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    institution: Optional[str] = None
    role: Optional[str] = None
    bio: Optional[str] = None
    default_provider: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    institution: str
    role: str
    bio: str
    default_provider: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
