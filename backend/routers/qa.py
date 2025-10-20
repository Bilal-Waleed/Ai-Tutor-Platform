from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from services.gemini_service import GeminiService
from routers.auth import get_current_user
from models.user import User
from routers.sessions import SessionCreate, MessageAdd, create_session, add_message

router = APIRouter()


class QABody(BaseModel):
    prompt: str
    language: str = "auto"
    session_id: int | None = None


def get_llm_service():
    return GeminiService()


@router.post("/qa")
async def ask_qa(
    body: QABody,
    llm: GeminiService = Depends(get_llm_service),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.current_subject == "general":
        return {"response": "Please select a subject first (e.g., math, coding)."}

    # Ensure a session exists; use proper Pydantic models for calls
    if not body.session_id:
        session_body = SessionCreate(subject=current_user.current_subject)
        session_res = create_session(session_body, db, current_user)
        body.session_id = session_res["session_id"]

    message_body = MessageAdd(session_id=body.session_id, prompt=body.prompt)
    res = add_message(message_body, llm, db, current_user)
    return res

# Removed /select-subject endpoint from here