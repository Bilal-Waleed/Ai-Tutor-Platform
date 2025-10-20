from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db import get_db
from models import User, Session as DBSession, Message
from routers.auth import get_current_user
from services.llm_service import LLMSService
from datetime import datetime

router = APIRouter(prefix="/sessions")

def get_llm_service():
    return LLMSService()

class SessionCreate(BaseModel):
    subject: str

class MessageAdd(BaseModel):
    session_id: int
    prompt: str

@router.post("/create")
def create_session(body: SessionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        # Update user's current_subject first
        current_user.current_subject = body.subject
        db.commit()
        db.refresh(current_user)
        
        # Create session with subject
        new_session = DBSession(
            user_id=current_user.id, 
            subject=body.subject, 
            created_at=datetime.utcnow(),
            name="Untitled Session"  # Default, updated on first message
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return {"session_id": new_session.id, "msg": "Session created", "subject": body.subject}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"DB Error: {str(e)}")

@router.get("/list")
def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(DBSession).filter(DBSession.user_id == current_user.id).order_by(desc(DBSession.created_at)).all()
    return [{"id": s.id, "name": s.name, "subject": s.subject, "created_at": s.created_at} for s in sessions]

@router.get("/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(DBSession).filter(DBSession.id == session_id, DBSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": session.id,
        "name": session.name,
        "subject": session.subject,
        "created_at": session.created_at
    }

@router.get("/messages/{session_id}")
def get_messages(session_id: int, page: int = 1, limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(DBSession).filter(DBSession.id == session_id, DBSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(desc(Message.timestamp)).offset((page - 1) * limit).limit(limit).all()
    return [{"role": m.role, "content": m.content, "timestamp": m.timestamp} for m in messages]

@router.post("/add-message")
def add_message(body: MessageAdd, llm: LLMSService = Depends(get_llm_service), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        session = db.query(DBSession).filter(DBSession.id == body.session_id, DBSession.user_id == current_user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Add user prompt
        user_msg = Message(session_id=body.session_id, role="user", content=body.prompt, timestamp=datetime.utcnow())
        db.add(user_msg)
        db.commit()
        
        # If first message, generate session name
        msg_count = db.query(Message).filter(Message.session_id == body.session_id).count()
        if msg_count == 1:
            name_prompt = f"Generate a short session name based on this prompt: {body.prompt}"
            session.name = llm.generate_response(name_prompt, "general")[:50]
            db.commit()
        
        # Generate response with auto language detection and appropriate length
        response = llm.generate_response(body.prompt, session.subject, language="auto")
        
        # Add assistant response
        assistant_msg = Message(session_id=body.session_id, role="assistant", content=response, timestamp=datetime.utcnow())
        db.add(assistant_msg)
        db.commit()
        
        # Return session name if updated
        return {"response": response, "session_name": session.name if msg_count == 1 else None}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")