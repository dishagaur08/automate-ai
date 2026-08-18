from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Activity, Task, User
from schemas import TaskCreate, TaskOut, TaskUpdate
from services.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


# ---------------------------------------------------------------------------
# Shared logic functions — reused by both the HTTP routes and the AI
# agent's tools (services/ai_tools.py). See routes/leads.py for the
# rationale, including the Phase 5 owner_id scoping.
# ---------------------------------------------------------------------------

def list_tasks_logic(
    db: Session,
    owner_id: int,
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
) -> list[Task]:
    query = db.query(Task).filter(Task.owner_id == owner_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f"%{search.strip()}%"))
    return query.order_by(Task.created_at.desc()).all()


def get_task_logic(db: Session, owner_id: int, task_id: int) -> Optional[Task]:
    return db.query(Task).filter(Task.id == task_id, Task.owner_id == owner_id).first()


def create_task_logic(db: Session, owner_id: int, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump(), owner_id=owner_id)
    db.add(task)
    db.commit()
    db.refresh(task)
    from services.workflows import execute_for_event
    execute_for_event(db, owner_id, "task", "created", task)

    db.add(Activity(type="task", description=f"Created a task — {task.title}", owner_id=owner_id))
    db.commit()
    return task


def update_task_logic(db: Session, task: Task, payload: TaskUpdate) -> Task:
    changes = payload.model_dump(exclude_unset=True)
    was_completed = task.status == "Completed"
    for field, value in changes.items():
        setattr(task, field, value)

    if "status" in changes:
        now_completed = task.status == "Completed"
        if now_completed and not was_completed:
            db.add(Activity(type="task", description=f"Completed a task — {task.title}", owner_id=task.owner_id))
        elif not now_completed and was_completed:
            db.add(Activity(type="task", description=f"Reopened a task — {task.title}", owner_id=task.owner_id))
        elif changes:
            db.add(Activity(type="update", description=f"Updated a task — {task.title}", owner_id=task.owner_id))
    elif changes:
        db.add(Activity(type="update", description=f"Updated a task — {task.title}", owner_id=task.owner_id))

    db.commit()
    db.refresh(task)
    from services.workflows import execute_for_event
    execute_for_event(db, task.owner_id, "task", "updated", task)
    if task.status == "Completed" and was_completed is False:
        execute_for_event(db, task.owner_id, "task", "completed", task)
    return task


def delete_task_logic(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


# ---------------------------------------------------------------------------
# HTTP routes — thin wrappers around the logic functions above.
# ---------------------------------------------------------------------------

@router.get("", response_model=list[TaskOut])
def list_tasks(
    search: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return list_tasks_logic(db, current_user.id, search=search, status=status, priority=priority)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    task = get_task_logic(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return create_task_logic(db, current_user.id, payload)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = get_task_logic(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return update_task_logic(db, task, payload)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    task = get_task_logic(db, current_user.id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    delete_task_logic(db, task)
    return None
