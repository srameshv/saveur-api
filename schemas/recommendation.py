from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class RecommendationRequest(BaseModel):
    city: str
    session_id: Optional[UUID] = None


class RecommendationOut(BaseModel):
    id: UUID
    user_id: UUID
    session_id: Optional[UUID]
    city: str
    result: Any
    created_at: datetime

    model_config = {"from_attributes": True}
