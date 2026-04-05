from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    budget: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=1000)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    budget: Optional[str] = Field(None, max_length=50)
    bio: Optional[str] = Field(None, max_length=1000)


class PreferencesUpdate(BaseModel):
    cuisines: Optional[list[str]] = Field(None, max_length=20)
    diets: Optional[list[str]] = Field(None, max_length=20)
    vibes: Optional[list[str]] = Field(None, max_length=20)


class PreferencesOut(BaseModel):
    id: UUID
    user_id: UUID
    cuisines: list[str]
    diets: list[str]
    vibes: list[str]

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: UUID
    email: str
    name: Optional[str]
    city: Optional[str]
    budget: Optional[str]
    bio: Optional[str]
    created_at: datetime
    preferences: Optional[PreferencesOut] = None

    model_config = {"from_attributes": True}
