"""
Pydantic schemas — request/response shapes for the API.

*Base: shared fields.
*Create: what the client sends to create a record.
*Update: partial — every field optional, for PATCH.
*Out: what the API returns (includes id + created_at).
"""

import re
from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: Optional[str]) -> Optional[str]:
    if value is None or value == "":
        return None
    if not EMAIL_RE.match(value):
        raise ValueError("Enter a valid email address")
    return value


# ---------- User / Auth (Phase 5) ----------

class UserCreate(BaseModel):
    name: str
    email: str
    password: str

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_required(cls, v: str) -> str:
        if not v or not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not v or len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_required(cls, v: str) -> str:
        if not v or not EMAIL_RE.match(v):
            raise ValueError("Enter a valid email address")
        return v.strip().lower()


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Knowledge Base / RAG (Phase 6) ----------

class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    content_type: Optional[str] = None
    size_bytes: int
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime


class SourceOut(BaseModel):
    document_id: int
    filename: str
    chunk_index: int
    excerpt: str
    score: float


class KnowledgeBaseQueryRequest(BaseModel):
    question: str

    @field_validator("question")
    @classmethod
    def question_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Question is required")
        return v.strip()


class KnowledgeBaseQueryResponse(BaseModel):
    status: str  # success | not_configured | error
    answer: Optional[str] = None
    sources: list[SourceOut] = []
    message: Optional[str] = None


# ---------- Lead ----------

class LeadBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str = "New"
    source: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None
    source: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class LeadOut(LeadBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Customer ----------

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: str = "Active"

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Name is required")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    status: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Name cannot be empty")
        return v.strip() if v else v

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: Optional[str]) -> Optional[str]:
        return _validate_email(v)


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Task ----------

class TaskBase(BaseModel):
    title: str
    status: str = "Pending"
    priority: str = "Medium"
    due_date: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Title is required")
        return v.strip()

    @field_validator("due_date")
    @classmethod
    def due_date_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Due date must be in YYYY-MM-DD format")
        return v


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip() if v else v

    @field_validator("due_date")
    @classmethod
    def due_date_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        try:
            datetime.strptime(v, "%Y-%m-%d")
        except ValueError:
            raise ValueError("Due date must be in YYYY-MM-DD format")
        return v


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# ---------- Activity ----------

class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    description: str
    created_at: datetime


# ---------- Approval ----------

class ApprovalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    title: str
    content: str
    related_to: Optional[str] = None
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class ApprovalAction(BaseModel):
    status: str  # "Approved" or "Rejected"

    @field_validator("status")
    @classmethod
    def status_valid(cls, v: str) -> str:
        if v not in ("Approved", "Rejected"):
            raise ValueError('status must be "Approved" or "Rejected"')
        return v


# ---------- Email (Phase 7) ----------

class EmailCreate(BaseModel):
    recipient: str
    subject: str
    body: str

    @field_validator("recipient")
    @classmethod
    def recipient_valid(cls, v: str) -> str:
        if not v or not EMAIL_RE.match(v.strip()):
            raise ValueError("Enter a valid recipient email address")
        return v.strip()

    @field_validator("subject", "body")
    @classmethod
    def text_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("This field is required")
        return v.strip()


class EmailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    approval_id: Optional[int] = None
    recipient: str
    subject: str
    body: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    sent_at: Optional[datetime] = None


# ---------- Dashboard ----------

class DashboardStats(BaseModel):
    total_leads: int
    active_customers: int
    tasks_completed_percentage: float
    ai_actions: int
    pending_approvals: int


class LeadAnalyticsPoint(BaseModel):
    day: str
    leads: int


# ---------- AI Command Center ----------

class AICommandRequest(BaseModel):
    command: str

    @field_validator("command")
    @classmethod
    def command_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Enter a command")
        return v.strip()


class AICommandResponse(BaseModel):
    """
    What the AI Command Center returns after processing one command.

    status:
      - "success"        a tool ran (or the AI replied) successfully
      - "error"          something went wrong (bad input, tool failure, etc.)
      - "not_configured" no LLM_API_KEY is set — the architecture works,
                          there's just no AI provider to call yet
    """

    status: str
    message: str
    tool: Optional[str] = None
    arguments: Optional[dict] = None
    data: Optional[dict] = None


class AICommandLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_request: str
    tool_name: Optional[str] = None
    status: str
    result_summary: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

# Phase 8 — workflow automation
class WorkflowCondition(BaseModel):
    field: str = Field(min_length=1, max_length=80)
    operator: Literal["equals", "not_equals", "contains", "in", "exists"] = "equals"
    value: Any = None

class WorkflowAction(BaseModel):
    type: Literal["create_task", "update_lead", "update_customer", "update_task", "send_email", "draft_email"]
    params: dict[str, Any] = Field(default_factory=dict)

class WorkflowCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    enabled: bool = True
    trigger_entity: Literal["lead", "customer", "task"]
    trigger_event: Literal["created", "updated", "completed"]
    conditions: list[WorkflowCondition] = Field(default_factory=list, max_length=10)
    actions: list[WorkflowAction] = Field(min_length=1, max_length=10)

class WorkflowUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    enabled: bool | None = None
    trigger_entity: Literal["lead", "customer", "task"] | None = None
    trigger_event: Literal["created", "updated", "completed"] | None = None
    conditions: list[WorkflowCondition] | None = Field(default=None, max_length=10)
    actions: list[WorkflowAction] | None = Field(default=None, max_length=10)

class WorkflowOut(BaseModel):
    id: int
    name: str
    description: str | None
    enabled: bool
    trigger_entity: str
    trigger_event: str
    conditions: list[WorkflowCondition]
    actions: list[WorkflowAction]
    created_at: datetime
    updated_at: datetime | None
    model_config = ConfigDict(from_attributes=True)

class WorkflowExecutionOut(BaseModel):
    id: int
    workflow_id: int
    trigger_entity: str
    trigger_event: str
    status: str
    details: dict[str, Any]
    error_message: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class WorkflowAISuggestRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)

# ---------- Advanced Analytics (Phase 9) ----------
class AnalyticsMetric(BaseModel):
    value: int | float
    previous: int | float = 0
    change_percent: float = 0.0

class AnalyticsPoint(BaseModel):
    date: str
    leads: int = 0
    qualified_leads: int = 0
    customers: int = 0
    tasks_created: int = 0
    tasks_completed: int = 0
    ai_commands: int = 0
    workflow_runs: int = 0
    workflow_success: int = 0
    workflow_failed: int = 0

class AnalyticsResponse(BaseModel):
    start_date: str
    end_date: str
    days: int
    metrics: dict[str, AnalyticsMetric]
    series: list[AnalyticsPoint]
