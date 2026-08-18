"""
Thin client for an OpenAI-compatible "embeddings" API.

Mirrors services/llm_client.py's shape and philosophy: same
OpenAI-compatible HTTP contract, provider-agnostic via env vars, never
raises raw network exceptions outward.

Falls back to LLM_API_KEY/LLM_BASE_URL when EMBEDDING_* vars are unset,
since most people running one OpenAI-compatible key want it to cover
both chat and embeddings. Set EMBEDDING_API_KEY/EMBEDDING_BASE_URL
explicitly to point embeddings at a different provider than chat.
"""

import os
from typing import Optional

import requests
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_API_KEY = (os.getenv("EMBEDDING_API_KEY", "").strip() or os.getenv("LLM_API_KEY", "").strip())
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small").strip()
EMBEDDING_BASE_URL = (
    os.getenv("EMBEDDING_BASE_URL", "").strip().rstrip("/")
    or os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
)

REQUEST_TIMEOUT_SECONDS = 30


class EmbeddingError(Exception):
    """Raised for any embedding-provider failure. Message is safe to show a user."""


def is_configured() -> bool:
    return bool(EMBEDDING_API_KEY)


def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Returns one embedding vector per input text, in the same order.
    Raises EmbeddingError with a user-safe message on any failure.
    """
    if not is_configured():
        raise EmbeddingError("Embedding provider is not configured.")
    if not texts:
        return []

    try:
        response = requests.post(
            f"{EMBEDDING_BASE_URL}/embeddings",
            headers={
                "Authorization": f"Bearer {EMBEDDING_API_KEY}",
                "Content-Type": "application/json",
            },
            json={"model": EMBEDDING_MODEL, "input": texts},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.exceptions.Timeout:
        raise EmbeddingError("The embedding provider took too long to respond. Please try again.")
    except requests.exceptions.ConnectionError:
        raise EmbeddingError("Could not reach the embedding provider. Check your network connection.")
    except requests.exceptions.RequestException:
        raise EmbeddingError("Could not reach the embedding provider.")

    if response.status_code == 401:
        raise EmbeddingError("The embedding provider rejected the request (invalid API key).")
    if response.status_code == 429:
        raise EmbeddingError("The embedding provider is rate-limiting requests. Please try again shortly.")
    if response.status_code >= 400:
        raise EmbeddingError(f"The embedding provider returned an error (status {response.status_code}).")

    try:
        body = response.json()
        # Sort by index — providers are expected to preserve order, but
        # don't rely on it.
        items = sorted(body["data"], key=lambda d: d.get("index", 0))
        return [item["embedding"] for item in items]
    except (ValueError, KeyError, IndexError, TypeError):
        raise EmbeddingError("The embedding provider returned an unexpected response.")


def embed_text(text: str) -> Optional[list[float]]:
    vectors = embed_texts([text])
    return vectors[0] if vectors else None
