"""
AI tool registry.

Every tool the AI agent can call is registered here as a Tool: a name,
a description (shown to the LLM so it knows when to use it), a Pydantic
model describing its arguments (validated BEFORE anything runs), and a
handler function that performs the actual work.

Handlers never touch the database directly — they call the same
*_logic functions the FastAPI routes use (routes/leads.py,
routes/tasks.py, routes/customers.py, routes/dashboard.py,
routes/approvals.py). This means an AI-created lead goes through
exactly the same validation and activity-logging as one created by a
human filling out the form.

Phase 5: every tool call is scoped to the user who issued the command.
run_tool takes the authenticated User and passes its id down to the
*_logic functions, so the AI Command Center can only see or act on
that user's own leads/tasks/customers/approvals — never another
user's data.

A handler returns a ToolResult: a short human-readable message plus a
JSON-serializable data payload the frontend can render.
"""

from dataclasses import dataclass
from typing import Any, Callable, Optional, Type

from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from models import EmailMessage, User
from routes.leads import (
    create_lead_logic,
    get_lead_logic,
    list_leads_logic,
    update_lead_logic,
)
from routes.tasks import create_task_logic, get_task_logic, list_tasks_logic, update_task_logic
from routes.customers import create_customer_logic, get_customer_logic, list_customers_logic
from routes.dashboard import compute_stats
from routes.approvals import create_approval
from schemas import (
    CustomerCreate,
    CustomerOut,
    CustomerUpdate,
    LeadCreate,
    LeadOut,
    LeadUpdate,
    TaskCreate,
    TaskOut,
    TaskUpdate,
)
from services import llm_client, rag
from services.llm_client import LLMError
from services.rag import RAGError


@dataclass
class ToolResult:
    message: str
    data: Optional[dict] = None


@dataclass
class ToolError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


@dataclass
class Tool:
    name: str
    description: str
    args_model: Type[BaseModel]
    handler: Callable[[Session, User, BaseModel], ToolResult]


# ---------------------------------------------------------------------------
# Argument schemas.
#
# create_lead and create_task reuse the EXISTING LeadCreate / TaskCreate
# schemas from schemas.py — no duplicate validation rules. The
# search/summary tools get small local schemas since no equivalent
# existed before (the routes used plain query params).
# ---------------------------------------------------------------------------

class SearchLeadsArgs(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None  # New, Qualified, Negotiation, Lost


class GetLeadArgs(BaseModel):
    lead_id: Optional[int] = None
    name: Optional[str] = None


class SearchTasksArgs(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None  # Pending, In Progress, Completed
    priority: Optional[str] = None  # Low, Medium, High


class SearchCustomersArgs(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None  # Active, Inactive


class NoArgs(BaseModel):
    pass


class DraftFollowupEmailArgs(BaseModel):
    name: str  # who the email is for
    topic: Optional[str] = "following up"


class AnswerFromKnowledgeBaseArgs(BaseModel):
    question: str


class UpdateLeadArgs(BaseModel):
    lead_id: Optional[int] = None
    name: Optional[str] = None
    status: Optional[str] = None  # New, Qualified, Negotiation, Lost
    company: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class UpdateTaskArgs(BaseModel):
    task_id: Optional[int] = None
    title: Optional[str] = None
    status: Optional[str] = None  # Pending, In Progress, Completed
    priority: Optional[str] = None  # Low, Medium, High
    due_date: Optional[str] = None


class CompleteTaskArgs(BaseModel):
    task_id: Optional[int] = None
    title: Optional[str] = None


# ---------------------------------------------------------------------------
# Handlers. Every handler receives (db, user, args) — `user` is the
# authenticated caller, and every *_logic call below is scoped to
# user.id so the AI can only read/write that user's own data.
# ---------------------------------------------------------------------------

def _handle_create_lead(db: Session, user: User, args: LeadCreate) -> ToolResult:
    lead = create_lead_logic(db, user.id, args)
    where = f" at {lead.company}" if lead.company else ""
    return ToolResult(
        message=f"Lead created successfully for {lead.name}{where}.",
        data=LeadOut.model_validate(lead).model_dump(mode="json"),
    )


def _handle_search_leads(db: Session, user: User, args: SearchLeadsArgs) -> ToolResult:
    leads = list_leads_logic(db, user.id, search=args.search, status=args.status)
    leads = leads[:10]
    if not leads:
        return ToolResult(message="No leads matched that search.", data={"leads": []})
    names = ", ".join(l.name for l in leads)
    return ToolResult(
        message=f"Found {len(leads)} lead(s): {names}.",
        data={"leads": [LeadOut.model_validate(l).model_dump(mode="json") for l in leads]},
    )


def _handle_get_lead(db: Session, user: User, args: GetLeadArgs) -> ToolResult:
    lead = None
    if args.lead_id is not None:
        lead = get_lead_logic(db, user.id, args.lead_id)
    elif args.name:
        matches = list_leads_logic(db, user.id, search=args.name)
        lead = matches[0] if matches else None
    else:
        raise ToolError("Provide either a lead_id or a name to look up.")

    if lead is None:
        who = args.name or f"id {args.lead_id}"
        return ToolResult(message=f"No lead found matching \u201c{who}\u201d.", data=None)

    return ToolResult(
        message=f"{lead.name}{' — ' + lead.company if lead.company else ''}: status {lead.status}.",
        data=LeadOut.model_validate(lead).model_dump(mode="json"),
    )


def _handle_update_lead(db: Session, user: User, args: UpdateLeadArgs) -> ToolResult:
    lead = None
    if args.lead_id is not None:
        lead = get_lead_logic(db, user.id, args.lead_id)
    elif args.name:
        matches = list_leads_logic(db, user.id, search=args.name)
        lead = matches[0] if matches else None
    else:
        raise ToolError("Provide either lead_id or name to update the lead.")

    if lead is None:
        who = args.name or f"id {args.lead_id}"
        raise ToolError(f"No lead found matching \u201c{who}\u201d.")

    update_payload = LeadUpdate(
        status=args.status,
        company=args.company,
        email=args.email,
        phone=args.phone,
    )
    updated = update_lead_logic(db, lead, update_payload)
    return ToolResult(
        message=f"Lead \u201c{updated.name}\u201d updated (status: {updated.status}).",
        data=LeadOut.model_validate(updated).model_dump(mode="json"),
    )


def _handle_create_customer(db: Session, user: User, args: CustomerCreate) -> ToolResult:
    customer = create_customer_logic(db, user.id, args)
    where = f" at {customer.company}" if customer.company else ""
    return ToolResult(
        message=f"Customer account created for {customer.name}{where}.",
        data=CustomerOut.model_validate(customer).model_dump(mode="json"),
    )


def _handle_create_task(db: Session, user: User, args: TaskCreate) -> ToolResult:
    task = create_task_logic(db, user.id, args)
    due = f" (due {task.due_date})" if task.due_date else ""
    return ToolResult(
        message=f"Task created: \u201c{task.title}\u201d{due}.",
        data=TaskOut.model_validate(task).model_dump(mode="json"),
    )


def _handle_update_task(db: Session, user: User, args: UpdateTaskArgs) -> ToolResult:
    task = None
    if args.task_id is not None:
        task = get_task_logic(db, user.id, args.task_id)
    elif args.title:
        matches = list_tasks_logic(db, user.id, search=args.title)
        task = matches[0] if matches else None
    else:
        raise ToolError("Provide a task_id or title to update the task.")

    if task is None:
        which = args.title or f"id {args.task_id}"
        raise ToolError(f"No task found matching \u201c{which}\u201d.")

    update_payload = TaskUpdate(
        status=args.status,
        priority=args.priority,
        due_date=args.due_date,
    )
    updated = update_task_logic(db, task, update_payload)
    return ToolResult(
        message=f"Task \u201c{updated.title}\u201d updated (status: {updated.status}).",
        data=TaskOut.model_validate(updated).model_dump(mode="json"),
    )


def _handle_complete_task(db: Session, user: User, args: CompleteTaskArgs) -> ToolResult:
    task = None
    if args.task_id is not None:
        task = get_task_logic(db, user.id, args.task_id)
    elif args.title:
        matches = list_tasks_logic(db, user.id, search=args.title)
        task = matches[0] if matches else None
    else:
        raise ToolError("Provide a task_id or title to complete.")

    if task is None:
        which = args.title or f"id {args.task_id}"
        raise ToolError(f"No task found matching \u201c{which}\u201d.")

    updated = update_task_logic(db, task, TaskUpdate(status="Completed"))
    return ToolResult(
        message=f"Task \u201c{updated.title}\u201d marked as Completed.",
        data=TaskOut.model_validate(updated).model_dump(mode="json"),
    )


def _handle_search_tasks(db: Session, user: User, args: SearchTasksArgs) -> ToolResult:
    tasks = list_tasks_logic(db, user.id, search=args.search, status=args.status, priority=args.priority)
    tasks = tasks[:10]
    if not tasks:
        return ToolResult(message="No tasks matched that search.", data={"tasks": []})
    return ToolResult(
        message=f"Found {len(tasks)} task(s).",
        data={"tasks": [TaskOut.model_validate(t).model_dump(mode="json") for t in tasks]},
    )


def _handle_search_customers(db: Session, user: User, args: SearchCustomersArgs) -> ToolResult:
    customers = list_customers_logic(db, user.id, search=args.search, status=args.status)
    customers = customers[:10]
    if not customers:
        return ToolResult(message="No customers matched that search.", data={"customers": []})
    names = ", ".join(c.name for c in customers)
    return ToolResult(
        message=f"Found {len(customers)} customer(s): {names}.",
        data={"customers": [CustomerOut.model_validate(c).model_dump(mode="json") for c in customers]},
    )


def _handle_dashboard_summary(db: Session, user: User, args: NoArgs) -> ToolResult:
    stats = compute_stats(db, user.id)
    message = (
        f"You have {stats.total_leads} leads, {stats.active_customers} active customers, "
        f"{stats.tasks_completed_percentage}% of tasks completed, and "
        f"{stats.pending_approvals} item(s) awaiting your approval."
    )
    return ToolResult(message=message, data=stats.model_dump())


def _handle_draft_followup_email(db: Session, user: User, args: DraftFollowupEmailArgs) -> ToolResult:
    # Look up the person for context (company, status) so the draft
    # isn't generic — reuses the same search logic as the Leads page,
    # scoped to this user's own leads.
    matches = list_leads_logic(db, user.id, search=args.name)
    context = ""
    related_to = args.name
    if matches:
        lead = matches[0]
        related_to = f"{lead.name}" + (f" — {lead.company}" if lead.company else "")
        context = f" They work at {lead.company}." if lead.company else ""
        context += f" Their lead status is currently '{lead.status}'."

    prompt = (
        f"Write a short, professional follow-up email to {args.name}.{context} "
        f"The email should be about: {args.topic}. "
        "Keep it under 130 words, friendly but professional. "
        "Sign off as 'The AutomateAI Team'. "
        "Return only the email body text, no subject line, no markdown."
    )

    try:
        body = llm_client.simple_completion(
            [
                {"role": "system", "content": "You write concise, professional business emails."},
                {"role": "user", "content": prompt},
            ]
        )
    except LLMError as err:
        raise ToolError(f"Could not generate the email draft: {err}")

    recipient = None
    if matches and matches[0].email:
        recipient = matches[0].email
    else:
        customer_matches = list_customers_logic(db, user.id, search=args.name)
        if customer_matches and customer_matches[0].email:
            recipient = customer_matches[0].email

    if not recipient:
        raise ToolError(f"I couldn't find an email address for {args.name}. Add one to the lead/customer first.")

    subject = f"Following up — {args.topic}" if args.topic else f"Following up with {args.name}"
    approval = create_approval(
        db,
        user.id,
        type_="email_draft",
        title=f"Follow-up email — {args.name}",
        content=body,
        related_to=related_to,
    )
    email = EmailMessage(
        owner_id=user.id,
        approval_id=approval.id,
        recipient=recipient,
        subject=subject,
        body=body,
        status="Pending Approval",
    )
    db.add(email)
    db.commit()
    db.refresh(email)

    return ToolResult(
        message=f"Drafted a follow-up email for {args.name} — sent for your approval.",
        data={"approval_id": approval.id, "email_id": email.id, "recipient": recipient, "subject": subject, "title": approval.title, "content": approval.content},
    )


def _handle_answer_from_knowledge_base(db: Session, user: User, args: AnswerFromKnowledgeBaseArgs) -> ToolResult:
    try:
        answer, sources = rag.answer_question(db, user, args.question)
    except RAGError as err:
        raise ToolError(str(err))

    return ToolResult(
        message=answer,
        data={
            "sources": [
                {
                    "document_id": s.document_id,
                    "filename": s.filename,
                    "chunk_index": s.chunk_index,
                    "excerpt": s.excerpt,
                    "score": s.score,
                }
                for s in sources
            ]
        },
    )


# ---------------------------------------------------------------------------
# Registry — the ONLY set of actions the AI is allowed to execute.
# ---------------------------------------------------------------------------

TOOLS: dict[str, Tool] = {
    "create_lead": Tool(
        name="create_lead",
        description="Create a new lead in the CRM. Use when the user wants to add a new lead/prospect.",
        args_model=LeadCreate,
        handler=_handle_create_lead,
    ),
    "search_leads": Tool(
        name="search_leads",
        description="Search or list leads by name/company/email text and/or status "
        "(New, Qualified, Negotiation, Lost).",
        args_model=SearchLeadsArgs,
        handler=_handle_search_leads,
    ),
    "get_lead": Tool(
        name="get_lead",
        description="Get a single lead's details by id or by name.",
        args_model=GetLeadArgs,
        handler=_handle_get_lead,
    ),
    "create_task": Tool(
        name="create_task",
        description="Create a new task. Use due_date in YYYY-MM-DD format if a date is mentioned or implied.",
        args_model=TaskCreate,
        handler=_handle_create_task,
    ),
    "search_tasks": Tool(
        name="search_tasks",
        description="Search or list tasks by title text, status (Pending, In Progress, Completed), "
        "and/or priority (Low, Medium, High).",
        args_model=SearchTasksArgs,
        handler=_handle_search_tasks,
    ),
    "search_customers": Tool(
        name="search_customers",
        description="Search or list customers by name/company/email text and/or status (Active, Inactive).",
        args_model=SearchCustomersArgs,
        handler=_handle_search_customers,
    ),
    "get_dashboard_summary": Tool(
        name="get_dashboard_summary",
        description="Get a summary of business metrics: total leads, active customers, "
        "task completion rate, and pending approvals.",
        args_model=NoArgs,
        handler=_handle_dashboard_summary,
    ),
    "create_customer": Tool(
        name="create_customer",
        description="Create a new customer record in the CRM.",
        args_model=CustomerCreate,
        handler=_handle_create_customer,
    ),
    "update_lead": Tool(
        name="update_lead",
        description="Update an existing lead's status (New, Qualified, Negotiation, Lost), company, email, or phone by lead_id or lead name.",
        args_model=UpdateLeadArgs,
        handler=_handle_update_lead,
    ),
    "update_task": Tool(
        name="update_task",
        description="Update a task's status, priority, or due_date by task_id or title.",
        args_model=UpdateTaskArgs,
        handler=_handle_update_task,
    ),
    "complete_task": Tool(
        name="complete_task",
        description="Mark a task as Completed by task_id or title.",
        args_model=CompleteTaskArgs,
        handler=_handle_complete_task,
    ),
    "draft_followup_email": Tool(
        name="draft_followup_email",
        description="Draft a follow-up email to a lead or customer about a topic. "
        "The draft is NOT sent — it is placed in the approval queue for a human to review.",
        args_model=DraftFollowupEmailArgs,
        handler=_handle_draft_followup_email,
    ),
    "answer_from_knowledge_base": Tool(
        name="answer_from_knowledge_base",
        description="Answer a question using the user's uploaded Knowledge Base documents "
        "(product info, pricing, FAQs, policies, etc.). Use this whenever the user asks "
        "something that sounds like it should be answered from company documents rather "
        "than the CRM data.",
        args_model=AnswerFromKnowledgeBaseArgs,
        handler=_handle_answer_from_knowledge_base,
    ),
}


def run_tool(db: Session, user: User, tool_name: str, raw_arguments: dict) -> ToolResult:
    """
    Validates raw_arguments against the tool's schema and executes it
    on behalf of `user`. Raises ToolError for any problem (unknown
    tool, bad arguments, business-logic failure) with a message that's
    safe to show a user.
    """
    tool = TOOLS.get(tool_name)
    if tool is None:
        raise ToolError(f"\u201c{tool_name}\u201d is not an available action.")

    try:
        args = tool.args_model(**raw_arguments)
    except ValidationError as err:
        first = err.errors()[0]
        field_name = ".".join(str(p) for p in first["loc"]) or "input"
        raise ToolError(f"{field_name}: {first['msg']}")

    try:
        return tool.handler(db, user, args)
    except ToolError:
        raise
    except Exception as err:  # noqa: BLE001 — last line of defence, never leak internals
        raise ToolError(f"Something went wrong while running {tool_name}.") from err


def tool_schemas_for_llm() -> list[dict]:
    """Builds the OpenAI-style `tools` array from the registry's Pydantic models."""
    schemas = []
    for tool in TOOLS.values():
        schemas.append(
            {
                "type": "function",
                "function": {
                    "name": tool.name,
                    "description": tool.description,
                    "parameters": tool.args_model.model_json_schema(),
                },
            }
        )
    return schemas
