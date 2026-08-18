# AI Architecture — AutomateAI Command Center (Phase 4)

This document explains, in plain terms, what happens when a user types a
request into the AI Command Center.

## The flow

```
User
 │  types a natural-language command
 ▼
AI Command Center (frontend)
 │  POST /api/ai/command  { "command": "..." }
 ▼
AI Agent (backend/services/ai_agent.py)
 │  builds a system prompt (available tools + today's date)
 │  sends the conversation + tool definitions to the LLM
 ▼
LLM  (OpenAI-compatible provider, configured via env vars)
 │  either replies in plain text, OR
 │  returns a structured tool call:
 │    { "tool": "create_lead", "arguments": { "name": "...", ... } }
 ▼
Tool Selection & Validation (backend/services/ai_tools.py)
 │  is "create_lead" a real, registered tool?      → reject if not
 │  do the arguments match the tool's schema?       → reject if not
 ▼
Tool Execution (backend/services/ai_tools.py)
 │  calls the SAME logic functions the normal REST API uses
 │  (routes/leads.py, routes/tasks.py, routes/customers.py, ...)
 ▼
Database / Business Logic (SQLAlchemy + SQLite)
 │  the lead/task/customer record is actually created/read
 │  an Activity row is logged, same as a human-driven action
 ▼
Result
 │  a short human-readable message + structured data
 ▼
AI Command Center (frontend)
 │  renders the result — a created lead, a list, an email draft, etc.
 ▼
User
```

## Why the agent never touches the database directly

The AI agent's only job is: **pick a tool, and check its arguments are
valid.** It never writes SQL, never imports SQLAlchemy models, and never
constructs a database row itself. Every tool handler in `ai_tools.py`
calls a `*_logic()` function that already existed in `routes/leads.py`,
`routes/tasks.py`, `routes/customers.py`, `routes/dashboard.py`, or
`routes/approvals.py` — the exact same functions the human-facing REST
API (the Leads page, the Tasks page, etc.) calls.

This means:
- An AI-created lead is validated and activity-logged identically to a
  human-created one.
- If the AI is ever compromised or misused, the "blast radius" is
  limited to the same operations a logged-in user can already perform
  through the UI — there is no separate, less-guarded code path.

## Tool-calling, not free-form text execution

The LLM never runs code. It can only respond with either plain text, or
a request to call one of the tools it was told about (`create_lead`,
`search_leads`, etc.), with arguments. The backend:

1. Checks the requested tool name exists in the registry — anything else
   is rejected.
2. Validates the arguments against that tool's Pydantic schema — missing
   required fields, bad types, or malformed dates are rejected with a
   clear error before anything runs.
3. Only then calls the tool's handler function.

## Human-in-the-loop for anything external-facing

`draft_followup_email` is deliberately different from the other tools:
instead of doing the final action, it creates a **Pending** row in the
existing `Approval` table (the same one powering the Dashboard's
"Review & Approval" panel) and stops. Nothing is sent. A person must
explicitly approve or reject it — through the Dashboard's Approval
panel, or through `POST /api/ai/approvals/{id}/approve|reject`, which
call the same `resolve_approval()` function either way.

## Graceful degradation without an API key

If `LLM_API_KEY` isn't set, `ai_agent.run_command()` returns immediately
with `status: "not_configured"` and a clear message — it never calls the
LLM, never crashes, and never pretends to understand the request. Every
other part of AutomateAI (Dashboard, Leads, Customers, Tasks, Approvals)
works normally regardless of whether an AI provider is configured.
