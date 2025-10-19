from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from .base import Base  # Shared Base
from datetime import datetime

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)