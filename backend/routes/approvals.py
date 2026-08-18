"""
Human-in-the-loop approvals. Powers the Dashboard's "Review & Approval"
panel and the AI Command Center's email-draft approval flow: a list of
AI-proposed actions (e.g. drafted emails) that a person must approve or
reject before anything happens for real.

Phase 5: approvals are owned by the user whose command produced them,
so one user's drafts never show up in another user's review queue.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Approval, EmailMessage, User
from schemas import ApprovalAction, ApprovalOut
from services.auth import get_current_user
from services.email import EmailDeliveryError, send_email

router = APIRouter(prefix="/api/approvals", tags=["approvals"])


# ---------------------------------------------------------------------------
# Shared logic functions — reused by the HTTP routes below AND by
# services/ai_tools.py (creating a draft) and services/ai_router.py
# (the Command Center's approve/reject endpoints).
# ---------------------------------------------------------------------------

def create_approval(
    db: Session, owner_id: int, type_: str, title: str, content: str, related_to: Optional[str] = None
) -> Approval:
    approval = Approval(
        type=type_, title=title, content=content, related_to=related_to, status="Pending", owner_id=owner_id
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    return approval


def get_approval_logic(db: Session, owner_id: int, approval_id: int) -> Optional[Approval]:
    return db.query(Approval).filter(Approval.id == approval_id, Approval.owner_id == owner_id).first()


def resolve_approval(db: Session, owner_id: int, approval_id: int, status: str) -> Approval:
    approval = get_approval_logic(db, owner_id, approval_id)
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "Pending":
        raise HTTPException(status_code=400, detail="This item has already been reviewed")

    linked_email = db.query(EmailMessage).filter(EmailMessage.approval_id == approval.id, EmailMessage.owner_id == owner_id).first()

    if status == "Approved" and approval.type == "email_draft":
        if linked_email is None:
            raise HTTPException(status_code=400, detail="Email draft metadata is missing; create a new draft before approving.")
        if linked_email.status == "Sent":
            raise HTTPException(status_code=400, detail="This email has already been sent")
        try:
            send_email(linked_email.recipient, linked_email.subject, linked_email.body)
        except EmailDeliveryError as exc:
            linked_email.status = "Failed"
            linked_email.error_message = str(exc)
            db.commit()
            raise HTTPException(status_code=503, detail=str(exc))
        linked_email.status = "Sent"
        linked_email.error_message = None
        linked_email.sent_at = datetime.utcnow()

    elif status == "Rejected" and linked_email is not None and linked_email.status != "Sent":
        linked_email.status = "Rejected"

    approval.status = status
    approval.resolved_at = datetime.utcnow()

    verb = "Approved" if status == "Approved" else "Rejected"
    db.add(Activity(type="update", description=f"{verb} — {approval.title}", owner_id=owner_id))

    db.commit()
    db.refresh(approval)
    return approval


# ---------------------------------------------------------------------------
# HTTP routes — thin wrappers around the logic functions above.
# ---------------------------------------------------------------------------

@router.get("", response_model=list[ApprovalOut])
def list_approvals(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Approval).filter(Approval.owner_id == current_user.id)
    if status:
        query = query.filter(Approval.status == status)
    return query.order_by(Approval.created_at.desc()).all()


@router.patch("/{approval_id}", response_model=ApprovalOut)
def act_on_approval(
    approval_id: int,
    payload: ApprovalAction,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return resolve_approval(db, current_user.id, approval_id, payload.status)
