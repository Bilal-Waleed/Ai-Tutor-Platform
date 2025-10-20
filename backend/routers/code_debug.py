from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.llm_service import LLMSService
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
    return LLMSService()

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
def debug_code(body: CodeBody, llm: LLMSService = Depends(get_llm), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        if not body.code.strip():
            raise HTTPException(status_code=400, detail="Code cannot be empty")
        
        # Generate session name
        session_name = generate_session_name(body.code, body.language)
        
        # Try fast heuristic analysis first
        quick = analyze_code_quick(body.language, body.code)

        # Analyze code with LLM
        analysis_prompt = f"""
        You are a senior engineer. Analyze the user's input below. If it's valid {body.language} code, do a structured code review. If it's not code (e.g., natural-language questions), clearly state that it's not code, then provide concise, actionable guidance relevant to {body.language}.

        Respond in this exact structured format:

        Summary:
        - 2-3 bullet points summarizing what the code does OR, if not code, what the user is asking.

        Issues (with line numbers if code):
        - [Line X] Description of issue and why it's a problem
        - If not code, list key points the user should know instead of issues.

        Fixes or Next Steps:
        - For each issue, propose a fix (if code). If not code, list clear next steps and resources.

        Corrected Code (only include if changes are needed and input was code):
        ```{body.language}
        ... full corrected snippet ...
        ```

        Best Practices & Improvements:
        - 2-5 bullets for readability, performance, or learning roadmap.

        User Input (preserve indentation and detect syntax accurately):
        ```
        {body.code}
        ```
        """
        
        # Try to get LLM analysis but don't fail the entire request if it errors
        try:
            llm_response = quick if quick else llm.generate_response(analysis_prompt, "coding")
        except Exception as llm_err:
            # Fallback response so we still persist the session and show something to the user
            llm_response = (
                "LLM analysis temporarily unavailable. Saved your code session. "
                f"Error: {str(llm_err)}"
            )
        
        # Check for syntax errors (basic check)
        has_error = False
        error_message = None
        
        try:
            if body.language == "python":
                compile(body.code, '<string>', 'exec')
            elif body.language == "javascript":
                # Basic JS syntax check - could be enhanced
                if body.code.count('{') != body.code.count('}'):
                    has_error = True
                    error_message = "Mismatched braces"
        except SyntaxError as e:
            has_error = True
            error_message = str(e)
        except Exception as e:
            has_error = True
            error_message = f"Compilation error: {str(e)}"
        
        # Optionally generate Roman Urdu version of the explanation (do not block save)
        response_roman = None
        try:
            roman_prompt = (
                "Translate the following explanation into Roman Urdu using Latin letters ONLY. "
                "Do NOT use Urdu or Hindi scripts. Preserve all code blocks exactly as-is (between triple backticks). "
                "Translate only the prose/explanations.\n\n"
                f"{llm_response}"
            )
            # Force Roman Urdu output irrespective of input language detection
            response_roman = llm.generate_response(roman_prompt, "coding", language="Roman Urdu (Latin script)")
        except Exception:
            response_roman = None

        # Create code session
        code_session = CodeSession(
            user_id=current_user.id,
            name=session_name,
            code_input=body.code,
            response=llm_response,
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
        # Do not compute Roman on GET to avoid slow loads; compute only at create
        "response_roman": None,
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