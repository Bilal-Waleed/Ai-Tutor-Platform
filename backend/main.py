from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import qa, recommend, code_debug, auth, sessions
from db import engine
from models.base import Base  # Import shared Base
from models import User, Session, Message, CodeSession  # Import models to register with Base

# Create all tables automatically (includes foreign keys)
Base.metadata.create_all(bind=engine)

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)