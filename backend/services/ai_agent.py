"""
The AI agent: turns one natural-language command into either

  (a) a tool call — validated, then executed through the existing
      business logic in routes/*.py (never touching the database
      directly), or
  (b) a plain text reply — when the request doesn't need a tool
      (a question the model can just answer, or a request for
      clarification).

If no LLM provider is configured (no LLM_API_KEY), run_command returns
a clear "not_configured" result instead of pretending to understand
the request. This keeps the rest of the app fully usable without an
API key — only the AI Command Center is affected.
"""

import json
from datetime import date

from sqlalchemy.orm import Session

from models import User
from services import llm_client
from services.ai_tools import ToolError, run_tool, tool_schemas_for_llm
from services.llm_client import LLMError

SYSTEM_PROMPT = (
    "You are AutomateAI, an AI business assistant embedded in a CRM product. "
    "You help a user manage leads, tasks, customers, and follow-up emails, and "
    "answer questions from their uploaded Knowledge Base documents, by calling "
    "the tools available to you. "
    "Only call a tool when the user's request clearly matches one. "
    "If the request is a general question you can answer directly, or is too "
    "vague to act on, reply in plain text instead of calling a tool — ask a "
    "short clarifying question if needed. "
    "Never claim an action succeeded unless you called a tool for it. "
    f"Today's date is {date.today().isoformat()} — use this to resolve relative "
    "dates like 'tomorrow' or 'next Monday' into YYYY-MM-DD format."
)


def run_command(db: Session, user: User, command: str) -> dict:
    """
    Runs one command on behalf of `user`. Every tool call it triggers
    is scoped to that user's own data (see services/ai_tools.py).

    Returns a dict matching schemas.AICommandResponse:
    {status, message, tool, arguments, data}
    """
    if not llm_client.is_configured():
        return {
            "status": "not_configured",
            "message": (
                "The AI Command Center isn't connected to an AI provider yet. "
                "Add LLM_API_KEY (and optionally LLM_MODEL / LLM_BASE_URL) to "
                "backend/.env and restart the backend to enable it."
            ),
            "tool": None,
            "arguments": None,
            "data": None,
        }

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": command},
    ]

    try:
        reply = llm_client.chat_completion(messages, tools=tool_schemas_for_llm())
    except LLMError as err:
        return {"status": "error", "message": str(err), "tool": None, "arguments": None, "data": None}

    tool_calls = reply.get("tool_calls") or []

    if not tool_calls:
        # The model chose to just reply in text — a valid outcome, not an error.
        content = (reply.get("content") or "").strip()
        return {
            "status": "success",
            "message": content or "I'm not sure how to help with that yet.",
            "tool": None,
            "arguments": None,
            "data": None,
        }

    call = tool_calls[0]
    tool_name = call.get("function", {}).get("name", "")
    raw_arguments = call.get("function", {}).get("arguments", "{}")

    try:
        arguments = json.loads(raw_arguments) if isinstance(raw_arguments, str) else raw_arguments
    except (ValueError, TypeError):
        return {
            "status": "error",
            "message": "The AI provider returned malformed tool arguments.",
            "tool": tool_name or None,
            "arguments": None,
            "data": None,
        }

    try:
        result = run_tool(db, user, tool_name, arguments)
    except ToolError as err:
        return {
            "status": "error",
            "message": str(err),
            "tool": tool_name or None,
            "arguments": arguments,
            "data": None,
        }

    return {
        "status": "success",
        "message": result.message,
        "tool": tool_name,
        "arguments": arguments,
        "data": result.data,
    }
