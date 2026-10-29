import os
from pathlib import Path
from sqlmodel import SQLModel, create_engine, Session
from fastapi.responses import JSONResponse
from fastapi import Request

# Database configuration
# Use a PostgreSQL URL in production (e.g., Supabase or Neon). Falls back to SQLite for local development.
BACKEND_DIR = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_PATH = BACKEND_DIR / "cashpulse.db"
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# SQLite requires a special connect argument; PostgreSQL does not.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    echo=True,
    connect_args=connect_args,
)

def create_db_and_tables():
    """Create all tables defined by SQLModel metadata.

    For SQLite (development) we also perform a lightweight migration to add any new columns
    that were introduced after the initial schema creation.
    """
    SQLModel.metadata.create_all(engine)
    # Lightweight migration for SQLite only
    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.begin() as conn:
                existing_cols = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(organization)").fetchall()]
                if "currency" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN currency VARCHAR DEFAULT 'USD'")
                if "monthly_burn" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN monthly_burn FLOAT DEFAULT 0.0")
                if "policy_floor" not in existing_cols:
                    conn.exec_driver_sql("ALTER TABLE organization ADD COLUMN policy_floor FLOAT DEFAULT 0.0")
        except Exception as e:
            print(f"Database schema migration notice: {e}")

def get_session():
    """FastAPI dependency that yields a database session per request."""
    with Session(engine) as session:
        yield session

# Middleware to enforce presence of tenant header for multi‑tenant isolation
async def tenant_header_middleware(request: Request, call_next):
    org_id = request.headers.get("X-Organization-ID")
    if not org_id:
        return JSONResponse(status_code=401, content={"detail": "Missing X-Organization-ID header"})
    # Store org_id for downstream use if needed
    request.state.org_id = int(org_id)
    response = await call_next(request)
    return response
