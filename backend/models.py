"""
SQLAlchemy models.

Lead, Customer, Task, Activity are the Phase 3 foundation. Approval is
added in Phase 3.1 as the minimum persistence layer needed for a real
human-in-the-loop review flow (Dashboard "Review & Approval"). User and
the owner_id / user_id columns below are added in Phase 5
(Authentication) so records can be scoped to the person who created
them.
"""

from datetime import datetime

from sqlalchemy import Column, ForeignKey, Integer, String, DateTime
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(String, nullable=False, default="New")  # New, Qualified, Negotiation, Lost
    source = Column(String, nullable=True)  # Website, Referral, Cold Outreach, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    status = Column(String, nullable=False, default="Active")  # Active, Inactive
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Pending")  # Pending, In Progress, Completed
    priority = Column(String, nullable=False, default="Medium")  # Low, Medium, High
    due_date = Column(String, nullable=True)  # ISO date string, e.g. "2026-08-25"
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    # type maps to a small fixed set the frontend knows how to render:
    # create, qualify, draft, answer, update, task
    type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class Approval(Base):
    """
    A human-in-the-loop item: something the AI (or, for now, the system)
    proposed that needs a person to approve or reject before it takes
    effect. Powers the Dashboard's "Review & Approval" button.
    """

    __tablename__ = "approvals"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # e.g. "email_draft"
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)  # the draft/body text needing review
    related_to = Column(String, nullable=True)  # e.g. a lead or customer name
    status = Column(String, nullable=False, default="Pending")  # Pending, Approved, Rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class EmailMessage(Base):
    __tablename__ = "email_messages"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    approval_id = Column(Integer, ForeignKey("approvals.id"), nullable=True, index=True)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Draft")
    # Draft, Pending Approval, Sent, Failed, Rejected
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)


class AICommandLog(Base):
    """
    A structured record of one AI Command Center interaction — what the
    user asked, which tool (if any) the AI selected, whether it
    succeeded, and a short human-readable summary of the result.

    Distinct from Activity: Activity is the general "what happened in
    the app" feed shown on the Dashboard; AICommandLog captures the
    extra detail specific to an AI command (the raw request, the tool
    chosen, success/error) that the Command Center's own history needs.
    """

    __tablename__ = "ai_command_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_request = Column(String, nullable=False)
    tool_name = Column(String, nullable=True)  # None if no tool was selected
    status = Column(String, nullable=False)  # "success" or "error"
    result_summary = Column(String, nullable=True)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)  # sanitized on-disk filename
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    status = Column(String, nullable=False, default="processing")
    # processing, ready, ready_no_embeddings, error
    chunk_count = Column(Integer, nullable=False, default=0)
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False, default=0)
    content = Column(String, nullable=False)
    # JSON-encoded list[float]; null until an embedding provider is configured.
    embedding = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="chunks")


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    enabled = Column(String, nullable=False, default="true")
    trigger_entity = Column(String, nullable=False)  # lead, customer, task
    trigger_event = Column(String, nullable=False)    # created, updated, completed
    conditions_json = Column(String, nullable=False, default="[]")
    actions_json = Column(String, nullable=False, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class WorkflowExecution(Base):
    __tablename__ = "workflow_executions"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    trigger_entity = Column(String, nullable=False)
    trigger_event = Column(String, nullable=False)
    status = Column(String, nullable=False, default="success")  # success, failed, skipped
    details_json = Column(String, nullable=False, default="{}")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
