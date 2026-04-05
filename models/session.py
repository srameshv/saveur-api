import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class SessionRestaurant(Base):
    __tablename__ = "session_restaurants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("dinner_sessions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    cuisine = Column(String, nullable=True)
    price_range = Column(String, nullable=True)
    address = Column(String, nullable=True)
    vibe = Column(String, nullable=True)
    source = Column(String, nullable=False, default="manual")  # "ai" | "manual"
    added_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    session = relationship("DinnerSession", back_populates="restaurants")


class SessionStatusEnum(str, enum.Enum):
    open = "open"
    decided = "decided"
    closed = "closed"


class DinnerSession(Base):
    __tablename__ = "dinner_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    city = Column(String, nullable=False)
    status = Column(Enum(SessionStatusEnum), nullable=False, default=SessionStatusEnum.open)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    group = relationship("Group", back_populates="sessions")
    votes = relationship("SessionVote", back_populates="session", cascade="all, delete-orphan")
    recommendations = relationship("AiRecommendation", back_populates="session")
    restaurants = relationship("SessionRestaurant", back_populates="session", cascade="all, delete-orphan")


class SessionVote(Base):
    __tablename__ = "session_votes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("dinner_sessions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    restaurant_name = Column(String, nullable=False)
    score = Column(Integer, nullable=False)

    session = relationship("DinnerSession", back_populates="votes")
    user = relationship("User", back_populates="votes")
