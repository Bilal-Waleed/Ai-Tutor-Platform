from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import qa, recommend, code_debug, auth, sessions, quiz
from db import engine
from models.base import Base  # Import shared Base
from models import User, Session, Message, CodeSession, Quiz, QuizQuestion, QuizAttempt, QuizSession  # Import models to register with Base
from sqlalchemy import text

# Create all tables automatically (includes foreign keys)
Base.metadata.create_all(bind=engine)

# Ensure missing columns exist (lightweight migration for 'users.history')
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS history JSON DEFAULT '[]'::json"))
        conn.execute(text("ALTER TABLE code_sessions ADD COLUMN IF NOT EXISTS response_roman TEXT"))
        conn.commit()
except Exception:
    # Safe to ignore on engines that don't support IF NOT EXISTS or during tests
    pass

app = FastAPI(title="Revotic Tutor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(qa.router, prefix="/api")
app.include_router(recommend.router, prefix="/api")
app.include_router(code_debug.router, prefix="/api")
app.include_router(sessions.router, prefix="/api")
app.include_router(quiz.router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)