from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.llm_service import LLMSService
from RestrictedPython import compile_restricted, safe_globals
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from db import get_db
from models.user import User

router = APIRouter()
def get_llm():
    return LLMSService()

class CodeBody(BaseModel):
    code: str
    lang: str = "python"

@router.post("/code-debug")
def debug_code(body: CodeBody, llm: LLMSService = Depends(get_llm), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        byte_code = compile_restricted(body.code, '<inline>', 'exec')
        exec(byte_code, safe_globals)
        response = {"output": "Success", "error": None}
    except Exception as e:
        suggestion = llm.generate_response(f"Explain and fix {body.lang} error: {str(e)} in simple words.", "coding")
        response = {"output": None, "error": str(e), "suggestion": suggestion}
        
    current_user.history.append({"prompt": body.code, "response": str(response), "subject": "coding"})
    db.commit()
    return response