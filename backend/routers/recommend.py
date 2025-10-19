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
from services.llm_service import LLMSService

router = APIRouter(prefix="/recommend")

# ------------------------------------------------------------------
# Dependency helper
# ------------------------------------------------------------------
def get_llm_service():
    """Return a fresh (or cached) LLMSService instance."""
    return LLMSService()

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

    if not progress:
        return {
            "recommendations": "Start with basics. Try a quiz in your subject.",
            "progress": progress,
        }

    low_sub = min(progress, key=progress.get)
    weak_areas = [
        h.get("prompt", "")
        for h in history
        if isinstance(h, dict) and "wrong" in h.get("response", "").lower()
    ]
    rec = (
        f"Focus on {low_sub} (score: {progress[low_sub]}%). "
        f"Suggestions: {', '.join(weak_areas[:3]) or 'Quiz on basics'}."
    )
    return {"recommendations": rec, "progress": progress}


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
    llm: LLMSService = Depends(get_llm_service),
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