# backend/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import os
from typing import Generator

# Database URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://admin:password123@localhost:5432/decision_modeling")

# Create engine
engine = create_engine(DATABASE_URL, echo=True)  # echo=True for development

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()