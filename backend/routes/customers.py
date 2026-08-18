from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Customer, User
from schemas import CustomerCreate, CustomerOut, CustomerUpdate
from services.auth import get_current_user

router = APIRouter(prefix="/api/customers", tags=["customers"])


# ---------------------------------------------------------------------------
# Shared logic functions — reused by both the HTTP routes and the AI
# agent's tools (services/ai_tools.py). See routes/leads.py for the
# rationale, including the Phase 5 owner_id scoping.
# ---------------------------------------------------------------------------

def list_customers_logic(
    db: Session, owner_id: int, search: Optional[str] = None, status: Optional[str] = None
) -> list[Customer]:
    query = db.query(Customer).filter(Customer.owner_id == owner_id)
    if status:
        query = query.filter(Customer.status == status)
    if search:
        like = f"%{search.strip()}%"
        query = query.filter(
            or_(Customer.name.ilike(like), Customer.company.ilike(like), Customer.email.ilike(like))
        )
    return query.order_by(Customer.created_at.desc()).all()


def get_customer_logic(db: Session, owner_id: int, customer_id: int) -> Optional[Customer]:
    return db.query(Customer).filter(Customer.id == customer_id, Customer.owner_id == owner_id).first()


def create_customer_logic(db: Session, owner_id: int, payload: CustomerCreate) -> Customer:
    customer = Customer(**payload.model_dump(), owner_id=owner_id)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    from services.workflows import execute_for_event
    execute_for_event(db, owner_id, "customer", "created", customer)

    db.add(
        Activity(
            type="create",
            description=f"Added a customer — {customer.name}"
            + (f", {customer.company}" if customer.company else ""),
            owner_id=owner_id,
        )
    )
    db.commit()
    return customer


def update_customer_logic(db: Session, customer: Customer, payload: CustomerUpdate) -> Customer:
    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(customer, field, value)

    if changes:
        db.add(
            Activity(
                type="update",
                description=f"Updated customer — {customer.name}",
                owner_id=customer.owner_id,
            )
        )
    db.commit()
    db.refresh(customer)
    from services.workflows import execute_for_event
    execute_for_event(db, customer.owner_id, "customer", "updated", customer)
    return customer


def delete_customer_logic(db: Session, customer: Customer) -> None:
    db.delete(customer)
    db.commit()


# ---------------------------------------------------------------------------
# HTTP routes — thin wrappers around the logic functions above.
# ---------------------------------------------------------------------------

@router.get("", response_model=list[CustomerOut])
def list_customers(
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_customers_logic(db, current_user.id, search=search, status=status)


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    customer = get_customer_logic(db, current_user.id, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("", response_model=CustomerOut, status_code=201)
def create_customer(
    payload: CustomerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return create_customer_logic(db, current_user.id, payload)


@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    customer = get_customer_logic(db, current_user.id, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return update_customer_logic(db, customer, payload)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    customer = get_customer_logic(db, current_user.id, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    delete_customer_logic(db, customer)
    return None
