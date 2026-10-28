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
    # Ensure newly added columns exist in SQLite database if it was previously created
    try:
        with engine.begin() as conn:
            existing_cols = [
                row[1]
                for row in conn.exec_driver_sql("PRAGMA table_info(organization)").fetchall()
            ]
            if "currency" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN currency VARCHAR DEFAULT 'USD'")
            if "monthly_burn" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN monthly_burn FLOAT DEFAULT 0.0")
            if "policy_floor" not in existing_cols:
                conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN policy_floor FLOAT DEFAULT 0.0")
    except Exception as e:
        print(f"Database schema migration notice: {e}")

def get_session():
    """FastAPI dependency yielding database sessions per request."""
    with Session(engine) as session:
        yield session
