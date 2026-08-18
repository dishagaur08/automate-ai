"""Phase 8 workflow engine. Keeps actions on the existing domain logic functions."""
import json
from typing import Any
from sqlalchemy.orm import Session
from models import Workflow, WorkflowExecution, User
from schemas import WorkflowAction, WorkflowCondition, TaskCreate, LeadUpdate, CustomerUpdate, TaskUpdate, EmailCreate
from routes.leads import get_lead_logic, create_lead_logic, update_lead_logic
from routes.customers import get_customer_logic, update_customer_logic
from routes.tasks import get_task_logic, create_task_logic, update_task_logic
from routes.emails import send_email_logic


def _enabled(w): return w.enabled == "true"
def _value(obj, field): return getattr(obj, field, None) if obj is not None else None

def conditions_match(conditions: list[dict], entity: Any) -> bool:
    for c in conditions:
        value = _value(entity, c.get("field"))
        op, target = c.get("operator", "equals"), c.get("value")
        if op == "equals" and str(value) != str(target): return False
        if op == "not_equals" and str(value) == str(target): return False
        if op == "contains" and str(target).lower() not in str(value or "").lower(): return False
        if op == "in" and str(value) not in [str(x) for x in (target or [])]: return False
        if op == "exists" and ((value is not None) != bool(target)): return False
    return True


def _run_action(db: Session, owner_id: int, action: dict, entity: Any):
    typ, p = action.get("type"), action.get("params", {})
    if typ == "create_task":
        return create_task_logic(db, owner_id, TaskCreate(title=p.get("title") or f"Follow up: {getattr(entity,'name', 'record')}", status=p.get("status", "Pending"), priority=p.get("priority", "Medium"), due_date=p.get("due_date")))
    if typ == "update_lead":
        if getattr(entity, "__tablename__", "") != "leads": return {"skipped": "entity is not a lead"}
        return update_lead_logic(db, entity, LeadUpdate(**{k:v for k,v in p.items() if k in {"name","email","phone","company","status","source"}}))
    if typ == "update_customer":
        if getattr(entity, "__tablename__", "") != "customers": return {"skipped": "entity is not a customer"}
        return update_customer_logic(db, entity, CustomerUpdate(**{k:v for k,v in p.items() if k in {"name","email","phone","company","status"}}))
    if typ == "update_task":
        if getattr(entity, "__tablename__", "") != "tasks": return {"skipped": "entity is not a task"}
        return update_task_logic(db, entity, TaskUpdate(**{k:v for k,v in p.items() if k in {"title","status","priority","due_date"}}))
    if typ in {"send_email", "draft_email"}:
        payload = EmailCreate(recipient=p.get("recipient") or getattr(entity,"email",None), subject=p.get("subject", "AutomateAI follow-up"), body=p.get("body", ""))
        if not payload.recipient: raise ValueError("Email action requires recipient or an entity email")
        if typ == "draft_email":
            from models import EmailMessage
            email=EmailMessage(owner_id=owner_id, **payload.model_dump(), status="Draft"); db.add(email); db.commit(); db.refresh(email); return email
        return send_email_logic(db, owner_id, payload)
    raise ValueError(f"Unsupported workflow action: {typ}")


def execute_for_event(db: Session, owner_id: int, entity_name: str, event: str, entity: Any):
    workflows = db.query(Workflow).filter(Workflow.owner_id == owner_id, Workflow.trigger_entity == entity_name, Workflow.trigger_event == event, Workflow.enabled == "true").all()
    for workflow in workflows:
        details = {"actions": [], "matched": False}
        execution = WorkflowExecution(workflow_id=workflow.id, owner_id=owner_id, trigger_entity=entity_name, trigger_event=event, status="success", details_json="{}")
        db.add(execution); db.flush()
        try:
            conditions=json.loads(workflow.conditions_json or "[]")
            if not conditions_match(conditions, entity):
                execution.status="skipped"; details["reason"]="conditions_not_met"; execution.details_json=json.dumps(details); db.commit(); continue
            details["matched"] = True
            for action in json.loads(workflow.actions_json or "[]"):
                result=_run_action(db, owner_id, action, entity)
                details["actions"].append({"type": action.get("type"), "result": getattr(result,"id",result)})
            execution.details_json=json.dumps(details, default=str); db.commit()
        except Exception as exc:
            db.rollback()
            execution=db.query(WorkflowExecution).filter(WorkflowExecution.id==execution.id).first()
            execution.status="failed"; execution.error_message=str(exc); execution.details_json=json.dumps(details, default=str); db.commit()
