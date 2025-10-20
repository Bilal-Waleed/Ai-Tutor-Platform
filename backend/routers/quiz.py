# backend/routers/quiz.py
# --------------------------------------------------------------
# Quiz system with AI-powered question generation
# Features:
#   - Dynamic quiz creation based on user progress
#   - AI-generated questions using Gemini
#   - Multiple question types (MCQ, fill-in-blank, code completion)
#   - Progress-based difficulty adjustment
#   - Real-time scoring and analytics
# --------------------------------------------------------------

import json
import random
import re
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
from models.quiz import Quiz, QuizQuestion, QuizAttempt, QuizSession
from routers.auth import get_current_user
from services.gemini_service import GeminiService

router = APIRouter(prefix="/quiz")

# ------------------------------------------------------------------
# Pydantic Models
# ------------------------------------------------------------------

class QuizCreate(BaseModel):
    subject: str
    difficulty: str = "beginner"  # beginner, intermediate, advanced
    quiz_type: str = "mixed"  # multiple_choice, fill_blank, code_completion, mixed
    total_questions: int = 10
    time_limit: int = 600  # 10 minutes default

class QuizQuestionResponse(BaseModel):
    id: int
    question_text: str
    question_type: str
    options: Optional[List[str]] = None
    points: int
    order: int

class QuizAnswer(BaseModel):
    question_id: int
    user_answer: str
    time_taken: int = 0

class QuizSubmit(BaseModel):
    quiz_id: int
    answers: List[QuizAnswer]

class QuizResult(BaseModel):
    quiz_id: int
    total_score: float
    percentage: float
    correct_answers: int
    total_questions: int
    time_taken: int
    detailed_results: List[Dict]

# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------

def get_llm_service():
    """Return a fresh GeminiService instance."""
    return GeminiService()

def generate_quiz_questions(subject: str, difficulty: str, quiz_type: str, count: int, llm: GeminiService) -> List[Dict]:
    """Generate quiz questions using AI based on subject and difficulty."""
    
    # Subject-specific question templates
    question_templates = {
        "coding": {
            "multiple_choice": [
                "What is the output of this Python code: {code}",
                "Which of the following is correct syntax for {concept}?",
                "What does this function do: {code}",
                "Which data structure is best for {use_case}?"
            ],
            "fill_blank": [
                "Complete this Python function: def {function_name}(): {code}",
                "Fill in the missing code: {code}",
                "What keyword is used for {concept}?",
                "Complete the loop: for i in {range}: {code}"
            ],
            "code_completion": [
                "Write a function that {description}",
                "Implement a {data_structure} class with {methods}",
                "Create a program that {task}",
                "Write code to {specific_task}"
            ]
        },
        "math": {
            "multiple_choice": [
                "What is the derivative of {function}?",
                "Solve this equation: {equation}",
                "What is the value of {expression}?",
                "Which formula is used for {concept}?"
            ],
            "fill_blank": [
                "The derivative of {function} is ___",
                "The solution to {equation} is ___",
                "The value of {expression} equals ___",
                "The formula for {concept} is ___"
            ],
            "code_completion": [
                "Calculate {mathematical_operation}",
                "Solve this problem: {problem_description}",
                "Find the value of {variable} in {equation}",
                "Prove that {mathematical_statement}"
            ]
        },
        "ielts": {
            "multiple_choice": [
                "Which is the correct form of {grammar_concept}?",
                "What is the meaning of {word}?",
                "Which sentence is grammatically correct?",
                "What is the main idea of this passage: {passage}"
            ],
            "fill_blank": [
                "Complete the sentence: {sentence}",
                "Choose the correct word: {sentence_with_blank}",
                "Fill in the preposition: {sentence}",
                "Complete the idiom: {idiom_start}"
            ],
            "code_completion": [
                "Write an essay introduction about {topic}",
                "Paraphrase this sentence: {sentence}",
                "Write a conclusion for this essay about {topic}",
                "Summarize this passage: {passage}"
            ]
        },
        "physics": {
            "multiple_choice": [
                "What is the unit of {physical_quantity}?",
                "Which law describes {phenomenon}?",
                "What is the formula for {concept}?",
                "What happens when {condition}?"
            ],
            "fill_blank": [
                "The unit of {quantity} is ___",
                "The formula for {concept} is ___",
                "According to {law}, ___",
                "The value of {constant} is ___"
            ],
            "code_completion": [
                "Calculate the {physical_quantity} when {given_values}",
                "Solve this physics problem: {problem}",
                "Derive the formula for {concept}",
                "Explain the principle of {phenomenon}"
            ]
        }
    }
    
    questions = []
    
    # Get templates for the subject
    templates = question_templates.get(subject, question_templates["coding"])
    
    # Generate questions based on quiz type
    if quiz_type == "mixed":
        types = ["multiple_choice", "fill_blank", "code_completion"]
    else:
        types = [quiz_type]
    
    for i in range(count):
        question_type = random.choice(types)
        template = random.choice(templates.get(question_type, templates["multiple_choice"]))
        
        # Generate question using AI
        prompt = f"""
        Generate a {difficulty} level {question_type} question for {subject} based on this template: "{template}"
        
        Requirements:
        - Make it educational and clear
        - Include specific examples or code snippets if applicable
        - Ensure it tests understanding, not just memorization
        - Provide 4 options for multiple choice questions
        - Include the correct answer and explanation
        
        Format the response as JSON:
        {{
            "question_text": "The actual question",
            "question_type": "{question_type}",
            "options": ["option1", "option2", "option3", "option4"] (only for multiple_choice),
            "correct_answer": "The correct answer",
            "explanation": "Why this answer is correct"
        }}
        """
        
        try:
            response = llm.generate_response(prompt, subject)
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                question_data = json.loads(json_match.group(0))
                question_data["difficulty"] = difficulty
                question_data["points"] = 10 if difficulty == "beginner" else (15 if difficulty == "intermediate" else 20)
                questions.append(question_data)
        except Exception as e:
            # Fallback to simple questions if AI generation fails
            questions.append({
                "question_text": f"Sample {subject} question {i+1}?",
                "question_type": question_type,
                "options": ["Option A", "Option B", "Option C", "Option D"] if question_type == "multiple_choice" else None,
                "correct_answer": "Sample answer",
                "explanation": "This is a sample explanation",
                "difficulty": difficulty,
                "points": 10
            })
    
    return questions

def calculate_quiz_score(answers: List[QuizAnswer], questions: List[QuizQuestion], llm: GeminiService) -> Dict:
    """Calculate quiz score using AI evaluation."""
    total_score = 0
    max_score = 0
    detailed_results = []
    
    for answer in answers:
        question = next((q for q in questions if q.id == answer.question_id), None)
        if not question:
            continue
            
        max_score += question.points
        
        # For multiple choice, check exact match
        if question.question_type == "multiple_choice":
            is_correct = answer.user_answer.strip().lower() == question.correct_answer.strip().lower()
            points_earned = question.points if is_correct else 0
        else:
            # Use AI to evaluate open-ended answers
            evaluation_prompt = f"""
            Evaluate this student answer for the question: "{question.question_text}"
            
            Student Answer: "{answer.user_answer}"
            Correct Answer: "{question.correct_answer}"
            
            Rate the answer on a scale of 0-100 based on:
            - Correctness (40%)
            - Completeness (30%)
            - Clarity (20%)
            - Understanding demonstrated (10%)
            
            Respond with just a number between 0-100.
            """
            
            try:
                evaluation_response = llm.generate_response(evaluation_prompt, "general")
                score_match = re.search(r'\d+', evaluation_response)
                score = int(score_match.group(0)) if score_match else 50
                points_earned = (score / 100) * question.points
                is_correct = score >= 70
            except:
                points_earned = 0
                is_correct = False
        
        total_score += points_earned
        
        detailed_results.append({
            "question_id": question.id,
            "question_text": question.question_text,
            "user_answer": answer.user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "points_earned": points_earned,
            "max_points": question.points,
            "time_taken": answer.time_taken
        })
    
    percentage = (total_score / max_score * 100) if max_score > 0 else 0
    
    return {
        "total_score": total_score,
        "max_score": max_score,
        "percentage": percentage,
        "detailed_results": detailed_results
    }

# ------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------

@router.post("/create")
def create_quiz(
    quiz_data: QuizCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: GeminiService = Depends(get_llm_service)
):
    """Create a new quiz with AI-generated questions based on user progress."""
    
    # Determine difficulty based on user progress if not specified
    if quiz_data.difficulty == "auto":
        user_progress = current_user.progress.get(quiz_data.subject, 0)
        if user_progress < 30:
            quiz_data.difficulty = "beginner"
        elif user_progress < 70:
            quiz_data.difficulty = "intermediate"
        else:
            quiz_data.difficulty = "advanced"
    
    # Generate quiz title
    title = f"{quiz_data.subject.title()} Quiz - {quiz_data.difficulty.title()}"
    
    # Create quiz record
    quiz = Quiz(
        user_id=current_user.id,
        subject=quiz_data.subject,
        title=title,
        difficulty=quiz_data.difficulty,
        quiz_type=quiz_data.quiz_type,
        total_questions=quiz_data.total_questions,
        time_limit=quiz_data.time_limit
    )
    
    db.add(quiz)
    db.flush()  # Get the quiz ID
    
    # Generate questions using AI
    questions_data = generate_quiz_questions(
        quiz_data.subject,
        quiz_data.difficulty,
        quiz_data.quiz_type,
        quiz_data.total_questions,
        llm
    )
    
    # Create question records
    for i, q_data in enumerate(questions_data):
        question = QuizQuestion(
            quiz_id=quiz.id,
            question_text=q_data["question_text"],
            question_type=q_data["question_type"],
            options=q_data.get("options"),
            correct_answer=q_data["correct_answer"],
            explanation=q_data.get("explanation"),
            difficulty=q_data["difficulty"],
            points=q_data["points"],
            order=i + 1
        )
        db.add(question)
    
    db.commit()
    
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "subject": quiz.subject,
        "difficulty": quiz.difficulty,
        "total_questions": quiz.total_questions,
        "time_limit": quiz.time_limit,
        "message": "Quiz created successfully with AI-generated questions!"
    }

@router.get("/{quiz_id}/questions")
def get_quiz_questions(
    quiz_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get quiz questions for a specific quiz."""
    
    quiz = db.query(Quiz).filter(
        Quiz.id == quiz_id,
        Quiz.user_id == current_user.id
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == quiz_id
    ).order_by(QuizQuestion.order).all()
    
    return {
        "quiz_id": quiz.id,
        "title": quiz.title,
        "subject": quiz.subject,
        "difficulty": quiz.difficulty,
        "time_limit": quiz.time_limit,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "question_type": q.question_type,
                "options": q.options,
                "points": q.points,
                "order": q.order
            }
            for q in questions
        ]
    }

@router.post("/submit")
def submit_quiz(
    submission: QuizSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    llm: GeminiService = Depends(get_llm_service)
):
    """Submit quiz answers and get results."""
    
    quiz = db.query(Quiz).filter(
        Quiz.id == submission.quiz_id,
        Quiz.user_id == current_user.id
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Get quiz questions
    questions = db.query(QuizQuestion).filter(
        QuizQuestion.quiz_id == submission.quiz_id
    ).all()
    
    # Calculate score
    score_result = calculate_quiz_score(submission.answers, questions, llm)
    
    # Create quiz session record
    quiz_session = QuizSession(
        user_id=current_user.id,
        quiz_id=submission.quiz_id,
        total_score=score_result["total_score"],
        max_possible_score=score_result["max_score"],
        percentage=score_result["percentage"],
        time_taken=sum(answer.time_taken for answer in submission.answers),
        status="completed"
    )
    
    db.add(quiz_session)
    
    # Record individual attempts
    for answer in submission.answers:
        question = next((q for q in questions if q.id == answer.question_id), None)
        if question:
            attempt = QuizAttempt(
                quiz_id=submission.quiz_id,
                question_id=answer.question_id,
                user_id=current_user.id,
                user_answer=answer.user_answer,
                is_correct=next((r["is_correct"] for r in score_result["detailed_results"] if r["question_id"] == answer.question_id), False),
                points_earned=next((r["points_earned"] for r in score_result["detailed_results"] if r["question_id"] == answer.question_id), 0),
                time_taken=answer.time_taken
            )
            db.add(attempt)
    
    # Update quiz status
    quiz.status = "completed"
    
    # Update user progress based on quiz performance
    if score_result["percentage"] >= 80:
        progress_increase = 5
    elif score_result["percentage"] >= 60:
        progress_increase = 3
    else:
        progress_increase = 1
    
    current_progress = current_user.progress.get(quiz.subject, 0)
    new_progress = min(100, current_progress + progress_increase)
    current_user.progress[quiz.subject] = new_progress
    
    db.commit()
    
    return {
        "quiz_id": submission.quiz_id,
        "total_score": score_result["total_score"],
        "max_score": score_result["max_score"],
        "percentage": score_result["percentage"],
        "correct_answers": len([r for r in score_result["detailed_results"] if r["is_correct"]]),
        "total_questions": len(score_result["detailed_results"]),
        "time_taken": quiz_session.time_taken,
        "detailed_results": score_result["detailed_results"],
        "progress_updated": new_progress,
        "message": f"Quiz completed! Your {quiz.subject} progress increased by {progress_increase}%"
    }

@router.get("/history")
def get_quiz_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's quiz history and performance."""
    
    quiz_sessions = db.query(QuizSession).filter(
        QuizSession.user_id == current_user.id
    ).order_by(QuizSession.completed_at.desc()).limit(20).all()
    
    return {
        "quiz_history": [
            {
                "quiz_id": session.quiz_id,
                "subject": session.quiz.subject,
                "title": session.quiz.title,
                "score": session.total_score,
                "percentage": session.percentage,
                "time_taken": session.time_taken,
                "completed_at": session.completed_at,
                "difficulty": session.quiz.difficulty
            }
            for session in quiz_sessions
        ],
        "total_quizzes": len(quiz_sessions),
        "average_score": sum(s.percentage for s in quiz_sessions) / len(quiz_sessions) if quiz_sessions else 0
    }

@router.get("/recommendations")
def get_quiz_recommendations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get personalized quiz recommendations based on user progress."""
    
    progress = current_user.progress or {}
    
    if not progress:
        return {
            "recommendations": [
                {
                    "subject": "coding",
                    "difficulty": "beginner",
                    "reason": "Start with basic coding concepts",
                    "quiz_type": "mixed"
                }
            ]
        }
    
    recommendations = []
    
    # Find weakest subject
    weakest_subject = min(progress.keys(), key=lambda x: progress[x])
    weakest_score = progress[weakest_subject]
    
    # Recommend quiz for weakest subject
    if weakest_score < 30:
        difficulty = "beginner"
        reason = f"Your {weakest_subject} score is low ({weakest_score:.1f}%). Start with beginner level."
    elif weakest_score < 60:
        difficulty = "intermediate"
        reason = f"Your {weakest_subject} score is moderate ({weakest_score:.1f}%). Try intermediate level."
    else:
        difficulty = "advanced"
        reason = f"Your {weakest_subject} score is good ({weakest_score:.1f}%). Challenge yourself with advanced level."
    
    recommendations.append({
        "subject": weakest_subject,
        "difficulty": difficulty,
        "reason": reason,
        "quiz_type": "mixed",
        "priority": "high"
    })
    
    # Recommend quizzes for other subjects to maintain balance
    for subject, score in progress.items():
        if subject != weakest_subject and score < 80:
            recommendations.append({
                "subject": subject,
                "difficulty": "intermediate" if score > 50 else "beginner",
                "reason": f"Maintain your {subject} skills",
                "quiz_type": "mixed",
                "priority": "medium"
            })
    
    return {
        "recommendations": recommendations,
        "progress_summary": progress
    }
