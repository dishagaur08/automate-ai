from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import os

from database import Base, engine, SessionLocal, migrate_schema
from routes import approvals, auth, dashboard, documents, leads, customers, tasks, workflows, analytics
from seed import seed_if_empty
from services import ai_router

app = FastAPI(title="AutomateAI API")

# Allow the frontend (Vite dev server) to call this API.
# In later phases this list should be restricted to real deployed domains.
def _cors_origins():
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [origin.strip().rstrip("/") for origin in raw.split(",") if origin.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Create tables if they don't exist yet, then seed demo data
    # if the database is empty. Safe to run on every restart.
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    db = SessionLocal()
    try:
        seed_if_empty(db)
        if os.getenv("SEED_DEMO_DATA", "true").strip().lower() in {"1", "true", "yes", "on"}:
            from models import User, Lead, Customer, Task, Approval, Activity, AICommandLog
            demo = db.query(User).filter(User.email == "demo@automateai.app").first()
            if demo:
                for model in (Lead, Customer, Task, Approval, Activity, AICommandLog):
                    db.query(model).filter(model.owner_id.is_(None)).update(
                        {model.owner_id: demo.id}, synchronize_session=False
                    )
                db.commit()
    finally:
        db.close()


app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(leads.router)
app.include_router(customers.router)
app.include_router(tasks.router)
app.include_router(approvals.router)
app.include_router(documents.router)
app.include_router(workflows.router)
app.include_router(analytics.router)
app.include_router(ai_router.router)


@app.get("/")
def read_root():
    return {"message": "AutomateAI API is running"}


@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "healthy"}
