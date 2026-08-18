from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Lead, User
from schemas import LeadCreate, LeadOut, LeadUpdate
from services.auth import get_current_user

router = APIRouter(prefix="/api/leads", tags=["leads"])


# ---------------------------------------------------------------------------
# Shared logic functions.
#
# These hold the actual business logic (query building, record creation,
# activity logging) and are called by BOTH the HTTP routes below AND the
# AI agent's tools (see services/ai_tools.py). This keeps a single source
# of truth — the AI agent never touches the database directly, it always
# goes through these same functions a human-driven request would use.
#
# Phase 5: every lead is owned by the user who created it (owner_id).
# list/get are scoped to `owner_id` so one user's CRM data never leaks
# into another user's view — including through the AI Command Center,
# which calls these same functions.
# ---------------------------------------------------------------------------

def list_leads_logic(
    db: Session, owner_id: int, search: Optional[str] = None, status: Optional[str] = None
) -> list[Lead]:
    query = db.query(Lead).filter(Lead.owner_id == owner_id)
    if status:
        query = query.filter(Lead.status == status)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(Lead.name.ilike(like), Lead.company.ilike(like), Lead.email.ilike(like))
        )
    return query.order_by(Lead.created_at.desc()).all()


def get_lead_logic(db: Session, owner_id: int, lead_id: int) -> Optional[Lead]:
    return db.query(Lead).filter(Lead.id == lead_id, Lead.owner_id == owner_id).first()


def create_lead_logic(db: Session, owner_id: int, payload: LeadCreate) -> Lead:
    lead = Lead(**payload.model_dump(), owner_id=owner_id)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    from services.workflows import execute_for_event
    execute_for_event(db, owner_id, "lead", "created", lead)

    db.add(
        Activity(
            type="create",
            description=f"Created a lead — {lead.name}"
            + (f", {lead.company}" if lead.company else ""),
            owner_id=owner_id,
        )
    )
    db.commit()
    return lead


def update_lead_logic(db: Session, lead: Lead, payload: LeadUpdate) -> Lead:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(lead, field, value)

    if changes:
        db.add(Activity(type="update", description=f"Updated a lead — {lead.name}", owner_id=lead.owner_id))
    db.commit()
    db.refresh(lead)
    from services.workflows import execute_for_event
    execute_for_event(db, lead.owner_id, "lead", "updated", lead)
    return lead


def delete_lead_logic(db: Session, lead: Lead) -> None:
    db.delete(lead)
    db.commit()


# ---------------------------------------------------------------------------
# HTTP routes — thin wrappers around the logic functions above.
# ---------------------------------------------------------------------------

@router.get("", response_model=list[LeadOut])
def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_leads_logic(db, current_user.id, search=search, status=status)


@router.get("/{lead_id}", response_model=LeadOut)
def get_lead(
    lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    lead = get_lead_logic(db, current_user.id, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.post("", response_model=LeadOut, status_code=201)
def create_lead(
    payload: LeadCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return create_lead_logic(db, current_user.id, payload)


@router.patch("/{lead_id}", response_model=LeadOut)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lead = get_lead_logic(db, current_user.id, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return update_lead_logic(db, lead, payload)


@router.delete("/{lead_id}", status_code=204)
def delete_lead(
    lead_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    lead = get_lead_logic(db, current_user.id, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    delete_lead_logic(db, lead)
    return None
