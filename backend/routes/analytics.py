"""Phase 9 user-scoped advanced analytics."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, Customer, Task, AICommandLog, WorkflowExecution, User
from schemas import AnalyticsResponse, AnalyticsMetric, AnalyticsPoint
from services.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def _date(value: str | None, fallback):
    if not value:
        return fallback
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Dates must use YYYY-MM-DD format")


def _metric(value, previous):
    change = 0.0 if not previous else round(((value - previous) / previous) * 100, 1)
    return AnalyticsMetric(value=value, previous=previous, change_percent=change)


@router.get("", response_model=AnalyticsResponse)
def get_analytics(
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    end = _date(end_date, datetime.utcnow().date())
    start = _date(start_date, end - timedelta(days=29))
    if start > end:
        raise HTTPException(400, "start_date cannot be after end_date")
    days = (end - start).days + 1
    if days > 366:
        raise HTTPException(400, "Date range cannot exceed 366 days")

    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=days - 1)

    def count(model, extra=None, lo=start, hi=end):
        q = db.query(func.count(model.id)).filter(model.owner_id == current_user.id, model.created_at >= datetime.combine(lo, datetime.min.time()), model.created_at < datetime.combine(hi + timedelta(days=1), datetime.min.time()))
        if extra is not None: q = q.filter(*extra)
        return q.scalar() or 0

    leads = count(Lead)
    qualified = count(Lead, [Lead.status == "Qualified"])
    customers = count(Customer)
    tasks_created = count(Task)
    tasks_completed = count(Task, [Task.status == "Completed"])
    ai_commands = count(AICommandLog)
    workflow_runs = count(WorkflowExecution)
    workflow_success = count(WorkflowExecution, [WorkflowExecution.status == "success"])
    workflow_failed = count(WorkflowExecution, [WorkflowExecution.status == "failed"])

    def prev(model, extra=None): return count(model, extra, prev_start, prev_end)
    metrics = {
        "leads": _metric(leads, prev(Lead)),
        "qualified_leads": _metric(qualified, prev(Lead, [Lead.status == "Qualified"])),
        "lead_conversion_rate": _metric(round((qualified / leads) * 100, 1) if leads else 0, round((prev(Lead, [Lead.status == "Qualified"]) / prev(Lead)) * 100, 1) if prev(Lead) else 0),
        "customers": _metric(customers, prev(Customer)),
        "tasks_created": _metric(tasks_created, prev(Task)),
        "tasks_completed": _metric(tasks_completed, prev(Task, [Task.status == "Completed"])),
        "ai_commands": _metric(ai_commands, prev(AICommandLog)),
        "workflow_runs": _metric(workflow_runs, prev(WorkflowExecution)),
        "workflow_success": _metric(workflow_success, prev(WorkflowExecution, [WorkflowExecution.status == "success"])),
    }

    def grouped(model, extra=None):
        expr = func.date(model.created_at)
        q = db.query(expr.label("day"), func.count(model.id)).filter(model.owner_id == current_user.id, expr >= str(start), expr <= str(end)).group_by(expr)
        if extra is not None: q = q.filter(*extra)
        return {str(d): n for d, n in q.all()}

    l, ql, c = grouped(Lead), grouped(Lead, [Lead.status == "Qualified"]), grouped(Customer)
    tc, td = grouped(Task), grouped(Task, [Task.status == "Completed"])
    ai = grouped(AICommandLog)
    wr, ws, wf = grouped(WorkflowExecution), grouped(WorkflowExecution, [WorkflowExecution.status == "success"]), grouped(WorkflowExecution, [WorkflowExecution.status == "failed"])
    series = []
    for i in range(days):
        d = start + timedelta(days=i); k = str(d)
        series.append(AnalyticsPoint(date=k, leads=l.get(k,0), qualified_leads=ql.get(k,0), customers=c.get(k,0), tasks_created=tc.get(k,0), tasks_completed=td.get(k,0), ai_commands=ai.get(k,0), workflow_runs=wr.get(k,0), workflow_success=ws.get(k,0), workflow_failed=wf.get(k,0)))
    return AnalyticsResponse(start_date=str(start), end_date=str(end), days=days, metrics=metrics, series=series)
