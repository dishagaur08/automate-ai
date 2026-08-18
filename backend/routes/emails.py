"""Email compose, draft, history and delivery endpoints (Phase 7)."""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, EmailMessage, User
from schemas import EmailCreate, EmailOut
from services.auth import get_current_user
from services.email import EmailDeliveryError, send_email

router = APIRouter(prefix="/api/emails", tags=["emails"])


def _email_out(email: EmailMessage) -> EmailOut:
    return EmailOut.model_validate(email)


def send_email_logic(db: Session, owner_id: int, payload: EmailCreate) -> EmailMessage:
    email = EmailMessage(
        owner_id=owner_id,
        recipient=payload.recipient,
        subject=payload.subject,
        body=payload.body,
        status="Sending",
    )
    db.add(email)
    db.flush()
    try:
        send_email(payload.recipient, payload.subject, payload.body)
    except EmailDeliveryError as exc:
        email.status = "Failed"
        email.error_message = str(exc)
        db.add(Activity(type="update", description=f"Email failed — {payload.subject}", owner_id=owner_id))
        db.commit()
        db.refresh(email)
        raise HTTPException(status_code=503, detail=str(exc))

    email.status = "Sent"
    email.sent_at = datetime.utcnow()
    db.add(Activity(type="update", description=f"Email sent — {payload.subject}", owner_id=owner_id))
    db.commit()
    db.refresh(email)
    return email


@router.get("", response_model=list[EmailOut])
def list_emails(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(EmailMessage)
        .filter(EmailMessage.owner_id == current_user.id)
        .order_by(EmailMessage.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/send", response_model=EmailOut, status_code=201)
def send_email_route(payload: EmailCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return send_email_logic(db, current_user.id, payload)


@router.post("/draft", response_model=EmailOut, status_code=201)
def create_draft(payload: EmailCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    email = EmailMessage(**payload.model_dump(), owner_id=current_user.id, status="Draft")
    db.add(email)
    db.add(Activity(type="draft", description=f"Saved email draft — {payload.subject}", owner_id=current_user.id))
    db.commit()
    db.refresh(email)
    return email


@router.post("/{email_id}/send", response_model=EmailOut)
def send_existing_email(email_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    email = db.query(EmailMessage).filter(EmailMessage.id == email_id, EmailMessage.owner_id == current_user.id).first()
    if email is None:
        raise HTTPException(status_code=404, detail="Email not found")
    if email.status == "Sent":
        raise HTTPException(status_code=400, detail="Email has already been sent")
    try:
        send_email(email.recipient, email.subject, email.body)
    except EmailDeliveryError as exc:
        email.status = "Failed"
        email.error_message = str(exc)
        db.commit()
        db.refresh(email)
        raise HTTPException(status_code=503, detail=str(exc))
    email.status = "Sent"
    email.error_message = None
    email.sent_at = datetime.utcnow()
    db.add(Activity(type="update", description=f"Email sent — {email.subject}", owner_id=current_user.id))
    db.commit()
    db.refresh(email)
    return email
