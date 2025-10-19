from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from services.llm_service import LLMSService
from routers.auth import get_current_user
from models.user import User

router = APIRouter()

class QABody(BaseModel):
    prompt: str
    language: str = "en"
    session_id: int = None

def get_llm_service():
    return LLMSService()

@router.post("/qa")
async def ask_qa(body: QABody, llm: LLMSService = Depends(get_llm_service), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.current_subject == "general":
        return {"response": "Please select a subject first (e.g., math, coding)."}
    
    if not body.session_id:
        from routers.sessions import create_session
        session_body = {"subject": current_user.current_subject}
        session_res = create_session(session_body, db, current_user)
        body.session_id = session_res["session_id"]
    
    from routers.sessions import add_message
    message_body = {"session_id": body.session_id, "prompt": body.prompt}
    res = add_message(message_body, llm, db, current_user)
    return res

# Removed /select-subject endpoint from here