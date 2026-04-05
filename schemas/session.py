from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from models.session import SessionStatusEnum


class SessionCreate(BaseModel):
    group_id: UUID
    title: str
    city: str


class SessionOut(BaseModel):
    id: UUID
    group_id: UUID
    title: str
    city: str
    status: SessionStatusEnum
    created_at: datetime

    model_config = {"from_attributes": True}


class VoteCreate(BaseModel):
    restaurant_name: str
    score: int = Field(..., ge=1, le=5)


class VoteOut(BaseModel):
    id: UUID
    session_id: UUID
    user_id: UUID
    restaurant_name: str
    score: int

    model_config = {"from_attributes": True}


class RestaurantResult(BaseModel):
    restaurant_name: str
    average_score: float
    vote_count: int


class SessionResults(BaseModel):
    session_id: UUID
    results: list[RestaurantResult]


class AddRestaurantRequest(BaseModel):
    name: str
    cuisine: Optional[str] = None
    price_range: Optional[str] = None
    address: Optional[str] = None
    vibe: Optional[str] = None


class SessionRestaurantOut(BaseModel):
    id: UUID
    session_id: UUID
    name: str
    cuisine: Optional[str]
    price_range: Optional[str]
    address: Optional[str]
    vibe: Optional[str]
    source: str
    added_by: Optional[UUID]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
