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
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()  # harmless if database.py already loaded it

LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")

REQUEST_TIMEOUT_SECONDS = 30


class LLMError(Exception):
    """Raised for any LLM-provider failure. Message is safe to show a user."""


def is_configured() -> bool:
    return bool(LLM_API_KEY)


def chat_completion(messages: list[dict], tools: Optional[list[dict]] = None) -> dict:
    """
    Calls POST {LLM_BASE_URL}/chat/completions and returns the first
    choice's message dict (may contain "content" and/or "tool_calls").
    Raises LLMError with a user-safe message on any failure.
    """
    if not is_configured():
        raise LLMError("AI provider is not configured.")

    payload = {"model": LLM_MODEL, "messages": messages}
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    try:
        response = requests.post(
            f"{LLM_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {LLM_API_KEY}",
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
