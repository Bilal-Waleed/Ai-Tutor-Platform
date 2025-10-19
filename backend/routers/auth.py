from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
import bcrypt
import jwt
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import os 

load_dotenv()

router = APIRouter(prefix="/auth") 

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY not set in .env")

ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class SubjectUpdate(BaseModel):
    subject: str

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter((User.username == user.username) | (User.email == user.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already exists")
    hashed_pw = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    db_user = User(username=user.username, email=user.email, password=hashed_pw.decode('utf-8'))
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return {"msg": "User created successfully"}

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not bcrypt.checkpw(form_data.password.encode('utf-8'), user.password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_expires = timedelta(weeks=1)
    
    token = jwt.encode({
        "sub": str(user.id),
        "exp": datetime.now(timezone.utc) + token_expires
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    return {"access_token": token, "token_type": "bearer"}

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = db.query(User).filter(User.id == int(user_id)).first() 
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid user ID")

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "current_subject": current_user.current_subject,
        "progress": current_user.progress
    }

@router.post("/select-subject")
def select_subject(body: SubjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    valid_subjects = ["math", "coding", "ielts", "physics"]
    normalized_subject = body.subject.lower()
    if normalized_subject not in valid_subjects:
        raise HTTPException(status_code=400, detail="Invalid subject")
    current_user.current_subject = normalized_subject
    db.commit()
    db.refresh(current_user)  # Ensure fresh object after update
    print(f"Updated subject for user {current_user.id}: {current_user.current_subject}")  # Fixed: Proper Python comment and print
    return {"msg": f"Subject set to {normalized_subject}"}