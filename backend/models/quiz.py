from sqlalchemy import Column, Integer, String, Text, JSON, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from .base import Base
from datetime import datetime, timezone

class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject = Column(String, nullable=False)
    title = Column(String, nullable=False)
    difficulty = Column(String, default="beginner")  # beginner, intermediate, advanced
    quiz_type = Column(String, default="mixed")  # multiple_choice, fill_blank, code_completion, mixed
    total_questions = Column(Integer, default=10)
    time_limit = Column(Integer, default=600)  # seconds
    status = Column(String, default="active")  # active, completed, abandoned
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="quizzes")
    questions = relationship("QuizQuestion", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_text = Column(Text, nullable=False)
    question_type = Column(String, nullable=False)  # multiple_choice, fill_blank, code_completion, explanation
    options = Column(JSON, nullable=True)  # For multiple choice questions
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    difficulty = Column(String, default="beginner")
    points = Column(Integer, default=10)
    order = Column(Integer, default=0)
    
    # Relationships
    quiz = relationship("Quiz", back_populates="questions")
    attempts = relationship("QuizAttempt", back_populates="question")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_answer = Column(Text, nullable=False)
    is_correct = Column(Boolean, default=False)
    points_earned = Column(Integer, default=0)
    time_taken = Column(Integer, default=0)  # seconds
    attempted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    quiz = relationship("Quiz", back_populates="attempts")
    question = relationship("QuizQuestion", back_populates="attempts")
    user = relationship("User")

class QuizSession(Base):
    __tablename__ = "quiz_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False)
    total_score = Column(Float, default=0.0)
    max_possible_score = Column(Float, default=0.0)
    percentage = Column(Float, default=0.0)
    time_taken = Column(Integer, default=0)  # total seconds
    status = Column(String, default="in_progress")  # in_progress, completed, abandoned
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    quiz = relationship("Quiz")
