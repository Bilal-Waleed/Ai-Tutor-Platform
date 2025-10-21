from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from .base import Base  # Shared Base
from datetime import datetime, timezone

class Session(Base):
    __tablename__ = "sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)  # Proper FK with cascade
    subject = Column(String, nullable=False)
    name = Column(String, default="Untitled Session")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))