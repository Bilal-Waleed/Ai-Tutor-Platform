from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.orm import relationship
from .base import Base  # Import shared Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)  # Hashed
    current_subject = Column(String, default="general")
    progress = Column(JSON, default={})
    # Lightweight chat history for recommendations and quick context
    history = Column(JSON, default=[])
    
    # Relationships
    code_sessions = relationship("CodeSession", back_populates="user", cascade="all, delete-orphan")
    quizzes = relationship("Quiz", back_populates="user", cascade="all, delete-orphan")
    