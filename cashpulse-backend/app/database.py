import os
from sqlmodel import SQLModel, create_engine, Session

# Uses SQLite for instant zero-config setup; can swap to PostgreSQL URL anytime
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./cashpulse.db")

# connect_args={"check_same_thread": False} is required only for SQLite
engine = create_engine(
    DATABASE_URL, 
    echo=True, 
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

def create_db_and_tables():
    """Creates database tables based on SQLModel metadata on app startup."""
    SQLModel.metadata.create_all(engine)

def get_session():
    """FastAPI dependency yielding database sessions per request."""
    with Session(engine) as session:
        yield session
