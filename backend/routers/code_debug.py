from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.gemini_service import GeminiService
from routers.auth import get_current_user
from sqlalchemy.orm import Session
from sqlalchemy import desc
from db import get_db
from models.user import User
from models.code_session import CodeSession
from datetime import datetime
import re

router = APIRouter(prefix="/code")

def get_llm():
    return GeminiService()

class CodeBody(BaseModel):
    code: str
    language: str = "python"

class CodeSessionResponse(BaseModel):
    session_id: int
    response: str
    response_roman: Optional[str] = None
    session_name: str
    has_error: bool
    error_message: Optional[str] = None

def analyze_code_quick(language: str, code: str) -> Optional[str]:
    """Fast heuristic analysis for common issues to reduce latency."""
    language = (language or "").lower()
    lines = code.splitlines()
    if language == "javascript":
        issues = []
        fixes = []
        corrected = code
        # console.log typo
        if re.search(r"\bconole\.log\b", code):
            issues.append("[Typo] 'conole.log' likha gaya hai; sahi 'console.log' hai.")
            corrected = re.sub(r"\bconole\.(log)\b", r"console.\\1", corrected)
            fixes.append("'conole.log' ko 'console.log' se replace karein.")
        # for loop common condition
        m = re.search(r"for\s*\(([^;]*);([^;]*);([^)]*)\)", code)
        if m:
            init, cond, step = m.group(1), m.group(2), m.group(3)
            num = re.search(r"\d+", cond)
            if re.search(r"i\s*>=\s*\d+", cond) and num:
                issues.append("[Loop condition] 'i >= N' se loop expected tarah iterate nahi hoga; aam tor par 'i < N' hota hai.")
                corrected = re.sub(r"for\s*\(([^;]*);([^;]*);([^)]*)\)", lambda _:
                    f"for({init}; i < {num.group(0)}; {step})", corrected, count=1)
                fixes.append("Condition ko 'i < N' karein taake 0 se N-1 tak iterate ho.")
        # declare i
        if re.search(r"for\s*\(\s*i\s*=", code) and not re.search(r"(let|var|const)\s+i\b", code):
            issues.append("[Declaration] 'i' declare nahi ki gayi. 'let i = 0' use karein.")
            corrected = re.sub(r"for\s*\(\s*i\s*=", "for(let i =", corrected, count=1)
            fixes.append("Loop mein 'let i = 0' add karein.")
        if issues or fixes:
            parts = [
                "Summary:\n- Loop aur console usage mein choti mistakes theek ki gai hain.",
                ("Issues:\n- " + "\n- ".join(issues)) if issues else "Issues:\n- None",
                ("Fixes:\n- " + "\n- ".join(fixes)) if fixes else "Fixes:\n- None",
                "Corrected Code:\n```javascript\n" + corrected + "\n```",
            ]
            return "\n\n".join(parts)
    if language == "python":
        issues = []
        fixes = []
        corrected = code
        try:
            compile(code, '<string>', 'exec')
        except SyntaxError as e:
            issues.append(f"[Syntax] {str(e)}")
            fixes.append("Indentation aur parentheses check karein; code ko proper blocks mein likhein.")
        if issues or fixes:
            parts = [
                "Summary:\n- Python code mein syntax/indentation check ki gai hai.",
                ("Issues:\n- " + "\n- ".join(issues)) if issues else "Issues:\n- None",
                ("Fixes:\n- " + "\n- ".join(fixes)) if fixes else "Fixes:\n- None",
                "Original Code:\n```python\n" + code + "\n```",
            ]
            return "\n\n".join(parts)
    return None

def generate_session_name(code: str, language: str) -> str:
    """Generate a meaningful session name based on code content"""
    # Extract first line or function name
    lines = code.strip().split('\n')
    first_line = lines[0].strip()
    
    # Try to extract function/class names
    if 'def ' in first_line:
        match = re.search(r'def\s+(\w+)', first_line)
        if match:
            return f"{language.title()} Function: {match.group(1)}"
    elif 'class ' in first_line:
        match = re.search(r'class\s+(\w+)', first_line)
        if match:
            return f"{language.title()} Class: {match.group(1)}"
    elif 'import ' in first_line:
        return f"{language.title()} Import Script"
    elif 'print(' in first_line or 'console.log' in first_line:
        return f"{language.title()} Output Script"
    else:
        # Use first few words
        words = first_line.split()[:3]
        return f"{language.title()} Code: {' '.join(words)}"

@router.post("/debug", response_model=CodeSessionResponse)
def debug_code(body: CodeBody, llm: GeminiService = Depends(get_llm), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if not body.code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Generate session name
        session_name = generate_session_name(body.code, body.language)
        
        # Analyze code with Gemini
        try:
            analysis_result = llm.analyze_code(body.code, body.language)
            llm_response = analysis_result["analysis"]
            response_roman = analysis_result["roman_analysis"]
            has_error = analysis_result["has_error"]
            error_message = None
        except Exception as llm_err:
            # Fallback response
            llm_response = f"Code analysis temporarily unavailable. Error: {str(llm_err)}"
            response_roman = f"Code analysis temporarily unavailable. Error: {str(llm_err)}"
            has_error = True
            error_message = str(llm_err)

        # Create code session
        code_session = CodeSession(
            user_id=current_user.id,
            name=session_name,
            code_input=body.code,
            response=llm_response,
            response_roman=response_roman,
            language=body.language,
            created_at=datetime.utcnow()
        )
        
        db.add(code_session)
        db.commit()
        db.refresh(code_session)
        
        return CodeSessionResponse(
            session_id=code_session.id,
            response=llm_response,
            response_roman=response_roman,
            session_name=session_name,
            has_error=has_error,
            error_message=error_message
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Debug error: {str(e)}")

@router.get("/sessions")
def get_code_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all code sessions for the current user"""
    sessions = db.query(CodeSession).filter(
        CodeSession.user_id == current_user.id
    ).order_by(desc(CodeSession.created_at)).all()
    
    return [
        {
            "id": session.id,
            "name": session.name,
            "language": session.language,
            "created_at": session.created_at.isoformat(),
            "code_preview": session.code_input[:100] + "..." if len(session.code_input) > 100 else session.code_input
        }
        for session in sessions
    ]

@router.get("/sessions/{session_id}")
def get_code_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get specific code session details"""
    session = db.query(CodeSession).filter(
        CodeSession.id == session_id,
        CodeSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Code session not found")
    
    return {
        "id": session.id,
        "name": session.name,
        "language": session.language,
        "code_input": session.code_input,
        "response": session.response,
        # Return stored Roman Urdu (computed at create time)
        "response_roman": session.response_roman,
        "created_at": session.created_at.isoformat()
    }

@router.delete("/sessions/{session_id}")
def delete_code_session(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a code session"""
    session = db.query(CodeSession).filter(
        CodeSession.id == session_id,
        CodeSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Code session not found")
    
    db.delete(session)
    db.commit()
    
    return {"message": "Code session deleted successfully"}