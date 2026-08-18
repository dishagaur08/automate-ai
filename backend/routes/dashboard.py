"""
Dashboard endpoints: aggregate stats, recent activity feed, and the
lead-analytics series the dashboard's chart renders.

Phase 5: every query is scoped to the logged-in user (owner_id) so the
Dashboard reflects only that user's own leads/customers/tasks/approvals.
"""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Approval, Customer, Lead, Task, User
from schemas import ActivityOut, DashboardStats, LeadAnalyticsPoint
from services.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def compute_stats(db: Session, owner_id: int) -> DashboardStats:
    """
    Shared with services/ai_tools.py's get_dashboard_summary tool, so the
    AI Command Center reports the exact same numbers as the Dashboard.
    """
    total_leads = db.query(Lead).filter(Lead.owner_id == owner_id).count()
    active_customers = (
        db.query(Customer).filter(Customer.owner_id == owner_id, Customer.status == "Active").count()
    )

    total_tasks = db.query(Task).filter(Task.owner_id == owner_id).count()
    completed_tasks = (
        db.query(Task).filter(Task.owner_id == owner_id, Task.status == "Completed").count()
    )
    tasks_completed_percentage = (
        round((completed_tasks / total_tasks) * 100, 1) if total_tasks else 0.0
    )

    # Development stand-in for "AI actions": every logged Activity row
    # for this user.
    ai_actions = db.query(Activity).filter(Activity.owner_id == owner_id).count()

    pending_approvals = (
        db.query(Approval).filter(Approval.owner_id == owner_id, Approval.status == "Pending").count()
    )

    return DashboardStats(
        total_leads=total_leads,
        active_customers=active_customers,
        tasks_completed_percentage=tasks_completed_percentage,
        ai_actions=ai_actions,
        pending_approvals=pending_approvals,
    )


@router.get("/stats", response_model=DashboardStats)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return compute_stats(db, current_user.id)


@router.get("/activity", response_model=list[ActivityOut])
def get_activity(
    limit: int = 10, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(Activity)
        .filter(Activity.owner_id == current_user.id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/lead-analytics", response_model=list[LeadAnalyticsPoint])
def get_lead_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    start = today - timedelta(days=6)

    day_expr = func.date(Lead.created_at)
    rows = (
        db.query(day_expr.label("day"), func.count(Lead.id))
        .filter(Lead.owner_id == current_user.id, day_expr >= str(start))
        .group_by(day_expr)
        .all()
    )
    counts_by_date = {str(day): count for day, count in rows}

    points = []
    for i in range(7):
        d = start + timedelta(days=i)
        points.append(
            LeadAnalyticsPoint(
                day=d.strftime("%a"),
                leads=counts_by_date.get(str(d), 0),
            )
        )
    return points
