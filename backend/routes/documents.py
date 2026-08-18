"""
Knowledge Base document endpoints (Phase 6).

Upload flow (synchronous — no background job queue in this phase):
  1. Validate extension + size, save the raw file to disk.
  2. Create a Document row (status="processing").
  3. Extract text (services/document_processing.py).
  4. Chunk the text.
  5. If an embedding provider is configured, embed every chunk and
     store the vectors; status -> "ready".
     Otherwise store the chunks WITHOUT embeddings; status ->
     "ready_no_embeddings" — the document is stored and will become
     searchable once an embedding provider is configured and it's
     re-uploaded (or re-processed).
  6. On any extraction failure, status -> "error" with a user-safe
     error_message; no chunks are created.

Every document and its chunks are owned by the uploading user
(owner_id) and all routes are scoped accordingly — see routes/leads.py
for the same ownership pattern used throughout the app.
"""

import json
import os
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import Document, DocumentChunk, User
from schemas import DocumentOut, KnowledgeBaseQueryRequest, KnowledgeBaseQueryResponse, SourceOut
from services import document_processing, embeddings, rag
from services.auth import get_current_user
from services.document_processing import ExtractionError
from services.embeddings import EmbeddingError
from services.rag import RAGError

router = APIRouter(prefix="/api", tags=["knowledge-base"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")


def _uploads_dir_for(owner_id: int) -> str:
    path = os.path.join(UPLOADS_DIR, str(owner_id))
    os.makedirs(path, exist_ok=True)
    return path


def _safe_filename(original: str) -> str:
    base = re.sub(r"[^A-Za-z0-9._-]", "_", original)[-150:]
    return f"{uuid.uuid4().hex}_{base}"


def process_document(db: Session, document: Document, raw_bytes: bytes) -> None:
    """Extract, chunk, and (if possible) embed a freshly-uploaded document."""
    try:
        text = document_processing.extract_text(raw_bytes, document.original_filename)
        pieces = document_processing.chunk_text(text)
    except ExtractionError as err:
        document.status = "error"
        document.error_message = str(err)
        db.commit()
        return

    if not pieces:
        document.status = "error"
        document.error_message = "No text could be extracted from this document."
        db.commit()
        return

    vectors: Optional[list[list[float]]] = None
    if embeddings.is_configured():
        try:
            vectors = embeddings.embed_texts(pieces)
        except EmbeddingError as err:
            document.status = "error"
            document.error_message = f"Text was extracted, but embedding failed: {err}"
            db.commit()
            return

    for i, piece in enumerate(pieces):
        chunk = DocumentChunk(
            document_id=document.id,
            owner_id=document.owner_id,
            chunk_index=i,
            content=piece,
            embedding=json.dumps(vectors[i]) if vectors else None,
        )
        db.add(chunk)

    document.chunk_count = len(pieces)
    document.status = "ready" if vectors else "ready_no_embeddings"
    if not vectors:
        document.error_message = (
            "Stored, but not searchable yet — no embedding provider is configured."
        )
    else:
        document.error_message = None
    db.commit()


@router.post("/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in document_processing.SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type \u201c{ext or 'unknown'}\u201d. Upload a PDF, TXT, or MD file.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File is too large (max 15 MB).")

    on_disk_name = _safe_filename(file.filename or "document")
    dest_path = os.path.join(_uploads_dir_for(current_user.id), on_disk_name)
    with open(dest_path, "wb") as f:
        f.write(raw_bytes)

    document = Document(
        filename=on_disk_name,
        original_filename=file.filename or "document",
        content_type=file.content_type,
        size_bytes=len(raw_bytes),
        status="processing",
        owner_id=current_user.id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    process_document(db, document, raw_bytes)
    db.refresh(document)
    return document


@router.get("/documents", response_model=list[DocumentOut])
def list_documents(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Document)
        .filter(Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
        .all()
    )


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    document = (
        db.query(Document)
        .filter(Document.id == document_id, Document.owner_id == current_user.id)
        .first()
    )
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(_uploads_dir_for(current_user.id), document.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass  # metadata deletion should still succeed

    db.delete(document)  # cascades to chunks
    db.commit()
    return None


@router.post("/knowledge-base/query", response_model=KnowledgeBaseQueryResponse)
def query_knowledge_base(
    payload: KnowledgeBaseQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not embeddings.is_configured():
        return KnowledgeBaseQueryResponse(
            status="not_configured",
            message=(
                "The Knowledge Base isn't connected to an embedding provider yet. "
                "Add EMBEDDING_API_KEY (or LLM_API_KEY) to backend/.env and restart "
                "the backend, then re-upload your documents."
            ),
        )

    try:
        answer, sources = rag.answer_question(db, current_user, payload.question)
    except RAGError as err:
        return KnowledgeBaseQueryResponse(status="error", message=str(err))

    return KnowledgeBaseQueryResponse(
        status="success",
        answer=answer,
        sources=[SourceOut(**s.__dict__) for s in sources],
    )
