# backend/routers/recommend.py
# --------------------------------------------------------------
# Recommendation & progress-related endpoints.
# NOTE:
#   - Subject selection has been moved to routers/auth.py
#     (POST /api/auth/select-subject).  Calling the old route here
#     will now return a helpful 404.
# --------------------------------------------------------------

import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
from routers.auth import get_current_user
from services.gemini_service import GeminiService

router = APIRouter(prefix="/recommend")

# ------------------------------------------------------------------
# Dependency helper
# ------------------------------------------------------------------
def get_llm_service():
    """Return a fresh (or cached) GeminiService instance."""
    return GeminiService()

# ------------------------------------------------------------------
# Pydantic models
# ------------------------------------------------------------------
class SubjectSelect(BaseModel):
    """Kept for backward compatibility; the endpoint is now deprecated."""
    subject: str

class ProgressUpdate(BaseModel):
    """Payload for updating a user's progress on a specific subject."""
    subject: str
    user_answer: str
    correct_answer: str

# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------
@router.get("/")
def get_recommendations(
    subject: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a simple recommendation based on stored progress and
    (optional) chat history.  If the user has no progress yet,
    a generic starter message is returned.
    """
    progress = current_user.progress or {}
    history = current_user.history or []
    current_subject = subject or current_user.current_subject or "general"

    if not progress:
        # Subject-specific welcome messages
        welcome_messages = {
            "coding": "Welcome to Coding! Start by asking about Python basics, variables, functions, or try debugging some code. Ask me 'What is a variable in Python?' or 'How do I create a function?'",
            "math": "Welcome to Math! Let's explore algebra, calculus, or geometry together. Try asking 'Explain derivatives' or 'How do I solve quadratic equations?'",
            "ielts": "Welcome to IELTS! Practice writing essays, improve vocabulary, or work on speaking skills. Ask me 'How to write a good essay?' or 'IELTS speaking tips'",
            "physics": "Welcome to Physics! Learn about motion, energy, or basic physics concepts. Try asking 'Explain Newton's laws' or 'What is kinetic energy?'",
            "general": "Welcome! Start your learning journey by selecting a subject and asking questions. Try asking 'What is a variable in Python?' or 'Explain calculus basics'."
        }
        return {
            "recommendations": welcome_messages.get(current_subject, welcome_messages["general"]),
            "progress": progress,
            "current_subject": current_subject
        }

    # Generate subject-specific recommendations
    subject_recommendations = {
        "coding": [
            "Practice Python basics with simple programs",
            "Try debugging some code examples", 
            "Learn about variables, functions, and loops",
            "Ask about data structures and algorithms",
            "Take a coding quiz to test your knowledge",
            "Practice object-oriented programming concepts",
            "Learn about error handling and exceptions",
            "Try building a simple calculator or game"
        ],
        "math": [
            "Practice algebra and calculus problems",
            "Learn about derivatives and integrals",
            "Try solving quadratic equations",
            "Ask about mathematical concepts step by step",
            "Take a math quiz to assess your skills",
            "Practice trigonometry and geometry",
            "Learn about limits and continuity",
            "Try solving word problems"
        ],
        "ielts": [
            "Practice writing essays on common topics",
            "Improve vocabulary and grammar",
            "Try speaking practice questions",
            "Learn about IELTS test format and tips",
            "Take an IELTS quiz to practice test questions",
            "Practice listening comprehension",
            "Work on reading strategies",
            "Learn academic writing techniques"
        ],
        "physics": [
            "Learn Newton's laws of motion",
            "Practice kinetic energy calculations",
            "Understand basic physics concepts",
            "Ask about formulas and their applications",
            "Take a physics quiz to test your understanding",
            "Learn about thermodynamics",
            "Practice projectile motion problems",
            "Understand electromagnetic concepts"
        ]
    }
    
    # If specific subject requested, use that subject
    target_subject = current_subject if current_subject != "general" else None
    
    if target_subject and target_subject in subject_recommendations:
        # Get recommendations for specific subject
        subject_suggestions = subject_recommendations[target_subject]
        subject_score = progress.get(target_subject, 0)
        
        if subject_score < 30:
            rec = f"Let's focus on {target_subject}! Start with: {subject_suggestions[0]}"
        elif subject_score < 50:
            rec = f"Good start in {target_subject}! Next try: {subject_suggestions[1]}"
        elif subject_score < 70:
            rec = f"Great progress in {target_subject}! Advance to: {subject_suggestions[2]}"
        else:
            rec = f"Excellent work in {target_subject}! Master level: {subject_suggestions[3]}"
    else:
        # Find weakest subject for general recommendations
        if progress:
            low_sub = min(progress, key=progress.get)
            low_score = progress[low_sub]
            subject_suggestions = subject_recommendations.get(low_sub, ["Continue practicing and asking questions"])
            
            if low_score < 50:
                rec = f"Your {low_sub} needs more practice (score: {low_score:.1f}%). Try: {subject_suggestions[0]}"
            elif low_score < 70:
                rec = f"Good progress in {low_sub} (score: {low_score:.1f}%). Next: {subject_suggestions[1]}"
            else:
                rec = f"Excellent work in {low_sub} (score: {low_score:.1f}%)! Try: {subject_suggestions[2]}"
        else:
            rec = "Start learning to get personalized recommendations!"
    
    return {"recommendations": rec, "progress": progress, "current_subject": current_subject}


@router.get("/progress")
def get_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight endpoint used by the frontend modal to fetch only the
    progress dictionary (no recommendation text).
    """
    return {"progress": current_user.progress or {}}


@router.post("/update-progress")
def update_progress(
    body: ProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: GeminiService = Depends(get_llm_service),
):
    """
    Score a user answer against the correct answer using the LLM,
    then update the stored average score for the given subject.
    """
    try:
        score_prompt = (
            f"Score user answer '{body.user_answer}' against correct "
            f"'{body.correct_answer}' on a scale 0-100."
        )
        score_response = llm.generate_response(score_prompt, "general")
        score_match = re.search(r"\d+", score_response)
        score = int(score_match.group(0)) if score_match else 50

        current_progress = current_user.progress.get(body.subject, 0)  # default 0 for new subjects
        new_score = (current_progress + score) / 2
        current_user.progress[body.subject] = new_score
        db.commit()
        return {"new_score": new_score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/select-subject")
def select_subject(
    body: SubjectSelect,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    **DEPRECATED** – Subject selection is now handled exclusively by
    POST /api/auth/select-subject.  Calling this route returns a clear
    message directing the client to the correct endpoint.
    """
    raise HTTPException(
        status_code=404,
        detail=(
            "Subject selection has moved. Use POST /api/auth/select-subject instead."
        ),
    )