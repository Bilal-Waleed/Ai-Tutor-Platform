from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .base import Base
from datetime import datetime

class CodeSession(Base):
    __tablename__ = "code_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, default="Code Debug Session")
    code_input = Column(Text, nullable=False)  # User's original code
    response = Column(Text, nullable=False)   # LLM debug response (English)
    response_roman = Column(Text, nullable=True)  # Roman Urdu translation
    language = Column(String, default="python")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="code_sessions")