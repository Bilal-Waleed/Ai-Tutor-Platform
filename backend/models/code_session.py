# from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
# from sqlalchemy.orm import relationship
# from db import Base  # Changed: Import from db, not models.base
# import datetime

# class CodeSession(Base):
#     __tablename__ = "code_sessions"

#     id = Column(Integer, primary_key=True, index=True)
#     user_id = Column(Integer, ForeignKey("users.id"))
#     name = Column(String, default="Code Debug Session")
#     code_input = Column(Text)  # User's original code
#     response = Column(Text)   # LLM debug response
#     created_at = Column(DateTime, default=datetime.datetime.utcnow)

#     user = relationship("User", back_populates="code_sessions")