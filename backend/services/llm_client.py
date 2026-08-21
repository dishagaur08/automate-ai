"""
Thin client for an OpenAI-compatible "chat completions" API.

Why this shape: OpenAI, and most OpenAI-compatible providers (Groq,
Together AI, OpenRouter, a locally hosted vLLM/Ollama server, etc.) all
speak this same HTTP shape. Pointing LLM_BASE_URL at a different
provider is enough to switch providers — no code changes needed.

This module never raises Python's raw network exceptions outward; it
converts them into LLMError with a message that is safe to show a user
(no API keys, no stack traces).
"""

import os
from pathlib import Path
from typing import Optional

import requests
from dotenv import load_dotenv

# Always load the backend/.env file regardless of where
# uvicorn is started from.
BACKEND_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BACKEND_DIR / ".env"

load_dotenv(dotenv_path=ENV_FILE, override=False)  # harmless if database.py already loaded it

# Prioritize GROQ_API_KEY, fallback to LLM_API_KEY
def _get_api_key() -> str:
    return (os.getenv("GROQ_API_KEY", "").strip() or os.getenv("LLM_API_KEY", "").strip())

def _get_base_url() -> str:
    return os.getenv(
        "LLM_BASE_URL",
        "https://api.groq.com/openai/v1"
    ).strip().rstrip("/")
def _get_model() -> str:
    return os.getenv("LLM_MODEL", "llama-3.3-70b-versatile").strip()

REQUEST_TIMEOUT_SECONDS = 30


class LLMError(Exception):
    """Raised for any LLM-provider failure. Message is safe to show a user."""


def is_configured() -> bool:
    return bool(_get_api_key())


def chat_completion(messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
    """
    Calls POST {LLM_BASE_URL}/chat/completions and returns the first
    choice's message dict (may contain "content" and/or "tool_calls").
    Raises LLMError with a user-safe message on any failure.
    """
    if not is_configured():
        raise LLMError("AI provider is not configured.")

    api_key = _get_api_key()
    base_url = _get_base_url()
    model = _get_model()

    payload = {"model": model, "messages": messages}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    try:
        response = requests.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout:
        raise LLMError("The AI provider took too long to respond. Please try again.")
    except requests.exceptions.ConnectionError:
        raise LLMError("Could not reach the AI provider. Check your network connection.")
    except requests.exceptions.RequestException:
        raise LLMError("Could not reach the AI provider.")

    if response.status_code == 401:
        raise LLMError("The AI provider rejected the request (invalid API key).")
    if response.status_code == 429:
        raise LLMError("The AI provider is rate-limiting requests. Please try again shortly.")
    if response.status_code >= 400:
        raise LLMError(f"The AI provider returned an error (status {response.status_code}).")

    try:
        body = response.json()
        return body["choices"][0]["message"]
    except (ValueError, KeyError, IndexError, TypeError):
        raise LLMError("The AI provider returned an unexpected response.")


def simple_completion(messages: list[dict]) -> str:
    """Convenience wrapper for a plain text reply (no tool calling)."""
    message = chat_completion(messages, tools=None)
    content = message.get("content")
    if not content or not content.strip():
        raise LLMError("The AI provider returned an empty response.")
    return content.strip()
