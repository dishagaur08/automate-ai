"""
Document text extraction and chunking for the Knowledge Base (Phase 6).

Extraction supports PDF (pypdf) and plain text (.txt, .md). Chunking is
a simple, dependency-free splitter: it prefers paragraph boundaries and
falls back to fixed-size slicing with overlap so no chunk is dropped
for lacking a clean break.
"""

import io
from typing import Optional

from pypdf import PdfReader

SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".md"}

CHUNK_SIZE = 1000  # characters
CHUNK_OVERLAP = 150  # characters


class ExtractionError(Exception):
    """Raised when a document's text can't be extracted. User-safe message."""


def extract_text(raw_bytes: bytes, filename: str) -> str:
    ext = _extension(filename)
    if ext == ".pdf":
        return _extract_pdf(raw_bytes)
    if ext in (".txt", ".md"):
        return _extract_plain_text(raw_bytes)
    raise ExtractionError(f"Unsupported file type \u201c{ext}\u201d. Upload a PDF, TXT, or MD file.")


def _extension(filename: str) -> str:
    idx = filename.rfind(".")
    return filename[idx:].lower() if idx != -1 else ""


def _extract_pdf(raw_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(raw_bytes))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as err:  # noqa: BLE001 — pypdf raises several exception types
        raise ExtractionError("Could not read this PDF — it may be corrupted or scanned/image-only.") from err

    text = "\n\n".join(p.strip() for p in pages if p.strip())
    if not text.strip():
        raise ExtractionError(
            "No extractable text found in this PDF (it may be a scanned image without a text layer)."
        )
    return text


def _extract_plain_text(raw_bytes: bytes) -> str:
    try:
        text = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            text = raw_bytes.decode("latin-1")
        except UnicodeDecodeError as err:
            raise ExtractionError("Could not decode this file as text.") from err

    if not text.strip():
        raise ExtractionError("This file is empty.")
    return text


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """
    Splits `text` into overlapping chunks, preferring paragraph breaks
    so a chunk doesn't cut a sentence in half when avoidable.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        paragraphs = [text.strip()] if text.strip() else []

    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        candidate = f"{current}\n\n{para}" if current else para
        if len(candidate) <= chunk_size:
            current = candidate
            continue

        if current:
            chunks.append(current)
        if len(para) <= chunk_size:
            current = para
        else:
            # A single paragraph longer than chunk_size: hard-slice it.
            for piece in _slice_with_overlap(para, chunk_size, overlap):
                chunks.append(piece)
            current = ""

    if current:
        chunks.append(current)

    if not chunks:
        return []

    # Apply overlap between paragraph-based chunks for better retrieval
    # continuity (skip for the first chunk).
    overlapped = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_tail = chunks[i - 1][-overlap:] if overlap else ""
        overlapped.append((prev_tail + "\n\n" + chunks[i]).strip() if prev_tail else chunks[i])

    return overlapped


def _slice_with_overlap(text: str, chunk_size: int, overlap: int) -> list[str]:
    pieces = []
    start = 0
    step = max(chunk_size - overlap, 1)
    while start < len(text):
        pieces.append(text[start : start + chunk_size])
        start += step
    return pieces
