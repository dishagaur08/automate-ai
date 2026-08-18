"""
API endpoints for the AI Command Center.

Phase 5: every endpoint requires an authenticated user, and every
command/approval is scoped to that user (see services/ai_agent.py,
services/ai_tools.py, routes/approvals.py).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import AICommandLog, User
from routes.approvals import resolve_approval
from schemas import AICommandLogOut, AICommandRequest, AICommandResponse, ApprovalOut
from services import ai_agent
from services.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/command", response_model=AICommandResponse)
def run_command(
    payload: AICommandRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = ai_agent.run_command(db, current_user, payload.command)

    # Log every command (except "not_configured", which isn't really an
    # interaction — nothing was attempted) so the Command Center's
    # history reflects real activity.
    if result["status"] != "not_configured":
        db.add(
            AICommandLog(
                user_request=payload.command,
                tool_name=result.get("tool"),
                status=result["status"],
                result_summary=result["message"] if result["status"] == "success" else None,
                error_message=result["message"] if result["status"] == "error" else None,
                owner_id=current_user.id,
            )
        )
        db.commit()

    return AICommandResponse(**result)


@router.get("/activity", response_model=list[AICommandLogOut])
def get_ai_activity(
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AICommandLog)
        .filter(AICommandLog.owner_id == current_user.id)
        .order_by(AICommandLog.created_at.desc())
        .limit(limit)
        .all()
    )


@router.post("/approvals/{approval_id}/approve", response_model=ApprovalOut)
def approve(
    approval_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return resolve_approval(db, current_user.id, approval_id, "Approved")


@router.post("/approvals/{approval_id}/reject", response_model=ApprovalOut)
def reject(
    approval_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return resolve_approval(db, current_user.id, approval_id, "Rejected")
