import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String)
    city = Column(String)
    budget = Column(String)
    bio = Column(Text)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    preferences = relationship("UserPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    group_memberships = relationship("GroupMember", back_populates="user")
    votes = relationship("SessionVote", back_populates="user")
    recommendations = relationship("AiRecommendation", back_populates="user")


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    cuisines = Column(ARRAY(String), default=list)
    diets = Column(ARRAY(String), default=list)
    vibes = Column(ARRAY(String), default=list)

    user = relationship("User", back_populates="preferences")
