"""
Database engine and session setup.

Uses SQLite for local development. The engine/session pattern here is
intentionally standard SQLAlchemy so swapping SQLITE_URL for a Postgres
URL later (e.g. via DATABASE_URL from .env) is a one-line change in
production — no model or route code needs to change.
"""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()  # picks up backend/.env if present (e.g. a real DATABASE_URL)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv(
    "DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'automate_ai.db')}"
)

# check_same_thread is only needed for SQLite (FastAPI uses multiple threads).
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Lightweight additive migration for local databases from earlier phases.
# SQLAlchemy create_all() does not add columns to an existing table.
LEGACY_OWNER_COLUMNS = {
    "leads": "owner_id INTEGER",
    "customers": "owner_id INTEGER",
    "tasks": "owner_id INTEGER",
    "activities": "owner_id INTEGER",
    "approvals": "owner_id INTEGER",
    "ai_command_logs": "owner_id INTEGER",
}


def migrate_schema():
    inspector = inspect(engine)
    with engine.begin() as conn:
        for table, column_def in LEGACY_OWNER_COLUMNS.items():
            if table not in inspector.get_table_names():
                continue
            columns = {c["name"] for c in inspector.get_columns(table)}
            column_name = column_def.split()[0]
            if column_name not in columns:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_def}"))
