"""
Retrieval-augmented generation over the Knowledge Base (Phase 6).

Search strategy: pragmatic local-development approach — chunk
embeddings are stored as JSON-encoded float lists directly on
DocumentChunk rows (SQLite/Postgres both handle this fine at
knowledge-base scale). At query time we embed the question, pull the
user's own chunks that have an embedding, and rank by cosine
similarity in plain Python. No separate vector database/service to run
locally. If this needs to scale to large corpora later, swap this
module's internals for a real vector index (pgvector, etc.) — nothing
above this layer (routes, AI tool) would need to change.

Every query is scoped to `owner_id`, so a user only ever retrieves
from their own uploaded documents.
"""

import json
import math
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from models import Document, DocumentChunk, User
from services import embeddings, llm_client
from services.embeddings import EmbeddingError
from services.llm_client import LLMError

TOP_K = 5
MIN_SIMILARITY = 0.15  # filters out obviously-irrelevant chunks


@dataclass
class Source:
    document_id: int
    filename: str
    chunk_index: int
    excerpt: str
    score: float


class RAGError(Exception):
    """User-safe error for the whole retrieve+answer flow."""


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def retrieve(db: Session, owner_id: int, query: str, top_k: int = TOP_K) -> list[Source]:
    """
    Embeds `query` and returns the top_k most similar chunks owned by
    `owner_id`, ranked by cosine similarity. Returns [] if no
    embedding-bearing chunks exist yet (nothing uploaded, or documents
    are still pending embeddings), without raising.
    """
    if not embeddings.is_configured():
        raise RAGError(
            "The embedding provider isn't configured, so the knowledge base can't "
            "be searched yet. Add EMBEDDING_API_KEY (or LLM_API_KEY) to backend/.env "
            "and re-upload your documents."
        )

    try:
        query_vector = embeddings.embed_text(query)
    except EmbeddingError as err:
        raise RAGError(str(err))

    chunks = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.owner_id == owner_id, DocumentChunk.embedding.isnot(None))
        .all()
    )
    if not chunks:
        return []

    scored: list[tuple[float, DocumentChunk]] = []
    for chunk in chunks:
        try:
            vector = json.loads(chunk.embedding)
        except (TypeError, ValueError):
            continue
        score = _cosine_similarity(query_vector, vector)
        if score >= MIN_SIMILARITY:
            scored.append((score, chunk))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    top = scored[:top_k]

    doc_ids = {chunk.document_id for _, chunk in top}
    docs_by_id = {d.id: d for d in db.query(Document).filter(Document.id.in_(doc_ids)).all()} if doc_ids else {}

    sources = []
    for score, chunk in top:
        doc = docs_by_id.get(chunk.document_id)
        sources.append(
            Source(
                document_id=chunk.document_id,
                filename=doc.original_filename if doc else "Unknown document",
                chunk_index=chunk.chunk_index,
                excerpt=chunk.content[:500],
                score=round(score, 4),
            )
        )
    return sources


def answer_question(db: Session, user: User, question: str) -> tuple[str, list[Source]]:
    """
    Full RAG flow: retrieve relevant chunks, then ask the LLM to answer
    using only that context, with inline citations like [1], [2].
    Returns (answer_text, sources). Raises RAGError for configuration
    or provider failures (safe to show the user).
    """
    sources = retrieve(db, user.id, question)

    if not sources:
        return (
            "I couldn't find anything relevant in your knowledge base. "
            "Try uploading a document about this topic, or rephrase your question.",
            [],
        )

    if not llm_client.is_configured():
        raise RAGError(
            "The AI provider isn't configured, so retrieved passages can't be "
            "turned into an answer yet. Add LLM_API_KEY to backend/.env."
        )

    context_blocks = []
    for i, src in enumerate(sources, start=1):
        context_blocks.append(f"[{i}] From \u201c{src.filename}\u201d:\n{src.excerpt}")
    context = "\n\n".join(context_blocks)

    prompt = (
        "Answer the user's question using ONLY the context passages below. "
        "Cite passages inline using their bracketed number, e.g. [1]. "
        "If the context doesn't contain the answer, say so plainly instead of guessing.\n\n"
        f"Context:\n{context}\n\nQuestion: {question}"
    )

    try:
        answer = llm_client.simple_completion(
            [
                {
                    "role": "system",
                    "content": "You answer questions strictly from the provided context and cite sources inline.",
                },
                {"role": "user", "content": prompt},
            ]
        )
    except LLMError as err:
        raise RAGError(str(err))

    return answer, sources
