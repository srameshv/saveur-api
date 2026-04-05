from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from models.group import RoleEnum


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None


class GroupOut(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_by: Optional[UUID]
    invite_code: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GroupMemberOut(BaseModel):
    id: UUID
    group_id: UUID
    user_id: UUID
    role: RoleEnum
    joined_at: datetime

    model_config = {"from_attributes": True}


class JoinGroupRequest(BaseModel):
    invite_code: str
