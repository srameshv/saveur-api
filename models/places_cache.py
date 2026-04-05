import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from database import Base


class PlacesCache(Base):
    __tablename__ = "places_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    location_key = Column(String, nullable=False, unique=True)  # normalized location string
    results = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
