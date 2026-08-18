import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from models import User, Workflow, WorkflowExecution
from schemas import WorkflowCreate, WorkflowOut, WorkflowUpdate, WorkflowExecutionOut, WorkflowAISuggestRequest
from database import get_db
from services.auth import get_current_user
from services.llm_client import simple_completion, LLMError

router=APIRouter(prefix='/api/workflows', tags=['workflows'])

def out(w):
    return WorkflowOut(id=w.id,name=w.name,description=w.description,enabled=w.enabled=='true',trigger_entity=w.trigger_entity,trigger_event=w.trigger_event,conditions=json.loads(w.conditions_json or '[]'),actions=json.loads(w.actions_json or '[]'),created_at=w.created_at,updated_at=w.updated_at)

def validate_config(payload):
    if payload.trigger_event=='completed' and payload.trigger_entity!='task':
        raise HTTPException(400,'The completed trigger is only valid for tasks.')
    for action in payload.actions:
        if action.type in {'update_lead','update_customer','update_task'} and not action.params:
            raise HTTPException(400,f'{action.type} requires parameters.')
    return payload

@router.get('', response_model=list[WorkflowOut])
def list_workflows(db:Session=Depends(get_db), current_user:User=Depends(get_current_user)):
    return [out(w) for w in db.query(Workflow).filter(Workflow.owner_id==current_user.id).order_by(Workflow.created_at.desc()).all()]

@router.post('', response_model=WorkflowOut, status_code=201)
def create_workflow(payload:WorkflowCreate, db:Session=Depends(get_db), current_user:User=Depends(get_current_user)):
    validate_config(payload)
    w=Workflow(owner_id=current_user.id,name=payload.name,description=payload.description,enabled='true' if payload.enabled else 'false',trigger_entity=payload.trigger_entity,trigger_event=payload.trigger_event,conditions_json=json.dumps([c.model_dump() for c in payload.conditions]),actions_json=json.dumps([a.model_dump() for a in payload.actions]))
    db.add(w); db.commit(); db.refresh(w); return out(w)

@router.get('/executions/history', response_model=list[WorkflowExecutionOut])
def execution_history(limit:int=50,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
    rows=db.query(WorkflowExecution).filter(WorkflowExecution.owner_id==current_user.id).order_by(WorkflowExecution.created_at.desc()).limit(min(limit,100)).all()
    return [WorkflowExecutionOut(id=r.id,workflow_id=r.workflow_id,trigger_entity=r.trigger_entity,trigger_event=r.trigger_event,status=r.status,details=json.loads(r.details_json or '{}'),error_message=r.error_message,created_at=r.created_at) for r in rows]


@router.patch('/{workflow_id}', response_model=WorkflowOut)
def update_workflow(workflow_id:int,payload:WorkflowUpdate,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
    w=db.query(Workflow).filter(Workflow.id==workflow_id,Workflow.owner_id==current_user.id).first()
    if not w: raise HTTPException(404,'Workflow not found')
    data=payload.model_dump(exclude_unset=True)
    if 'trigger_event' in data and data['trigger_event']=='completed' and data.get('trigger_entity',w.trigger_entity)!='task': raise HTTPException(400,'The completed trigger is only valid for tasks.')
    if 'trigger_entity' in data and data['trigger_entity']!='task' and data.get('trigger_event',w.trigger_event)=='completed': raise HTTPException(400,'The completed trigger is only valid for tasks.')
    for key in ('name','description','trigger_entity','trigger_event'):
        if key in data: setattr(w,key,data[key])
    if 'enabled' in data: w.enabled='true' if data['enabled'] else 'false'
    if 'conditions' in data: w.conditions_json=json.dumps(data['conditions'])
    if 'actions' in data: w.actions_json=json.dumps(data['actions'])
    db.commit(); db.refresh(w); return out(w)

@router.delete('/{workflow_id}',status_code=204)
def delete_workflow(workflow_id:int,db:Session=Depends(get_db),current_user:User=Depends(get_current_user)):
    w=db.query(Workflow).filter(Workflow.id==workflow_id,Workflow.owner_id==current_user.id).first()
    if not w: raise HTTPException(404,'Workflow not found')
    db.delete(w); db.commit()

@router.post('/ai-suggest')
def ai_suggest(payload:WorkflowAISuggestRequest,current_user:User=Depends(get_current_user)):
    prompt='''Create one safe AutomateAI workflow from this request. Return ONLY valid JSON with keys name, description, trigger_entity (lead/customer/task), trigger_event (created/updated/completed), conditions (array of {field,operator,value}), actions (array of {type,params}). Allowed action types: create_task, update_lead, update_customer, update_task, send_email, draft_email. Never invent unsupported fields. Request: '''+payload.prompt
    try:
        text=simple_completion([{'role':'system','content':'You design small, deterministic CRM workflows.'},{'role':'user','content':prompt}])
        text=text.strip().removeprefix('```json').removesuffix('```').strip()
        data=json.loads(text); return validate_config(WorkflowCreate(**data)).model_dump()
    except (LLMError,ValueError,json.JSONDecodeError,TypeError) as exc:
        raise HTTPException(422, f'Could not create a workflow suggestion: {exc}')
