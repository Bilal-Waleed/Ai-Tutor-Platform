#!/usr/bin/env python3
"""
Database Migration Script for Quiz System
Adds quiz-related tables to the existing database.
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Load environment variables
load_dotenv()

def run_migration():
    """Run the quiz system migration."""
    
    # Database connection
    db_password = os.getenv('DB_PASSWORD', 'password')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'aittutor')
    db_user = os.getenv('DB_USER', 'postgres')
    
    connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    try:
        engine = create_engine(connection_string)
        connection = engine.connect()
        
        print("🔄 Starting Quiz System Migration...")
        
        # Create quiz tables
        quiz_tables = [
            """
            CREATE TABLE IF NOT EXISTS quizzes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                subject VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                difficulty VARCHAR DEFAULT 'beginner',
                quiz_type VARCHAR DEFAULT 'mixed',
                total_questions INTEGER DEFAULT 10,
                time_limit INTEGER DEFAULT 600,
                status VARCHAR DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id SERIAL PRIMARY KEY,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                question_text TEXT NOT NULL,
                question_type VARCHAR NOT NULL,
                options JSON,
                correct_answer TEXT NOT NULL,
                explanation TEXT,
                difficulty VARCHAR DEFAULT 'beginner',
                points INTEGER DEFAULT 10,
                order_index INTEGER DEFAULT 0
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                id SERIAL PRIMARY KEY,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_answer TEXT NOT NULL,
                is_correct BOOLEAN DEFAULT FALSE,
                points_earned INTEGER DEFAULT 0,
                time_taken INTEGER DEFAULT 0,
                attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                total_score FLOAT DEFAULT 0.0,
                max_possible_score FLOAT DEFAULT 0.0,
                percentage FLOAT DEFAULT 0.0,
                time_taken INTEGER DEFAULT 0,
                status VARCHAR DEFAULT 'in_progress',
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP
            )
            """
        ]
        
        # Execute table creation
        for i, table_sql in enumerate(quiz_tables, 1):
            print(f"   Creating table {i}/4...")
            connection.execute(text(table_sql))
        
        # Create indexes for performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject)",
            "CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status)",
            "CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id)",
            "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id)",
            "CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON quiz_sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_id ON quiz_sessions(quiz_id)"
        ]
        
        print("   Creating indexes...")
        for index_sql in indexes:
            connection.execute(text(index_sql))
        
        connection.commit()
        print("✅ Quiz System Migration Completed Successfully!")
        
        # Verify tables exist
        print("\n🔍 Verifying Migration...")
        tables_to_check = ['quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_sessions']
        
        for table in tables_to_check:
            result = connection.execute(text(f"SELECT COUNT(*) FROM {table}"))
            count = result.scalar()
            print(f"   ✅ {table}: {count} records")
        
        print("\n🎉 Quiz System is ready to use!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False
    finally:
        if 'connection' in locals():
            connection.close()
    
    return True

def verify_migration():
    """Verify that the migration was successful."""
    
    db_password = os.getenv('DB_PASSWORD', 'password')
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'aittutor')
    db_user = os.getenv('DB_USER', 'postgres')
    
    connection_string = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    
    try:
        engine = create_engine(connection_string)
        connection = engine.connect()
        
        print("🔍 Verifying Quiz System Migration...")
        
        # Check if all tables exist
        tables = ['quizzes', 'quiz_questions', 'quiz_attempts', 'quiz_sessions']
        
        for table in tables:
            result = connection.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                )
            """))
            exists = result.scalar()
            
            if exists:
                print(f"   ✅ {table} table exists")
            else:
                print(f"   ❌ {table} table missing")
                return False
        
        print("✅ All quiz tables verified successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Quiz System Database Migration')
    parser.add_argument('--verify', action='store_true', help='Verify migration instead of running it')
    
    args = parser.parse_args()
    
    if args.verify:
        success = verify_migration()
    else:
        success = run_migration()
    
    sys.exit(0 if success else 1)
