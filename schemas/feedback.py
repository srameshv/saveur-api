from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    type: str = Field(..., pattern="^(bug|feature)$")
    message: str = Field(..., min_length=1, max_length=2000)


class FeedbackOut(BaseModel):
    id: UUID
    user_id: Optional[UUID]
    type: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}
