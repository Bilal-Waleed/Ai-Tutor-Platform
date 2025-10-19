from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv
from models.base import Base  

load_dotenv()
DB_PASSWORD = os.getenv('DB_PASSWORD')
SQLALCHEMY_DATABASE_URL = f"postgresql://postgres:{DB_PASSWORD}@localhost:5432/aittutor"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()