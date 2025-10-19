# import datetime
# from fastapi import APIRouter, Depends, HTTPException
# from pydantic import BaseModel
# from sqlalchemy.orm import Session
# from db import get_db
# from models.user import User
# from models.code_session import CodeSession
# from routers.auth import get_current_user
# from services.llm_service import LLMSService

# router = APIRouter(prefix="/code-sessions")

# def get_llm_service():
#     return LLMSService()

# class DebugRequest(BaseModel):
#     code: str
#     language: str = "python"  # Default, can be overridden

# @router.post("/debug")
# def debug_code(
#     body: DebugRequest,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user),
#     llm: LLMSService = Depends(get_llm_service)
# ):
#     if not body.code.strip():
#         raise HTTPException(status_code=400, detail="Code is required")
    
#     # LLM prompt for analysis, fix, explanation
#     prompt = f"""
#     Analyze the following {body.language} code for errors.
#     Explain any issues found.
#     Provide a fixed version of the code.
#     Add suggestions for best practices.
    
#     Code:
#     {body.code}
#     """
#     response = llm.generate_response(prompt, "coding")
    
#     # Create and save code session
#     session_name = f"{body.language.upper()} Debug - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}"
#     code_session = CodeSession(
#         user_id=current_user.id,
#         name=session_name,
#         code_input=body.code,
#         response=response
#     )
#     db.add(code_session)
#     db.commit()
#     db.refresh(code_session)
    
#     return {"session_id": code_session.id, "response": response}

# @router.get("/list")
# def list_sessions(
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     sessions = db.query(CodeSession).filter(CodeSession.user_id == current_user.id).order_by(CodeSession.created_at.desc()).all()
#     return [
#         {
#             "id": s.id,
#             "name": s.name,
#             "created_at": s.created_at.isoformat(),
#             "language": s.name.split()[0].lower() if s.name else "unknown"
#         } for s in sessions
#     ]

# @router.get("/{session_id}")
# def get_session(
#     session_id: int,
#     db: Session = Depends(get_db),
#     current_user: User = Depends(get_current_user)
# ):
#     session = db.query(CodeSession).filter(CodeSession.id == session_id, CodeSession.user_id == current_user.id).first()
#     if not session:
#         raise HTTPException(status_code=404, detail="Code session not found")
#     return {
#         "code_input": session.code_input,
#         "response": session.response,
#         "name": session.name
#     }