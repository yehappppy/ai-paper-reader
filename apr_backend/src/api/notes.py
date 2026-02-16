"""Notes management API endpoints."""

import fcntl
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import markdown
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Pydantic Models ============


class NoteMetadata(BaseModel):
    """Note metadata model."""

    id: str = Field(description="Note ID (paper name)")
    paper_id: str = Field(description="Associated paper ID")
    filename: str = Field(description="Note filename")
    file_size: int = Field(description="File size in bytes")
    created_at: str = Field(description="Creation timestamp")
    modified_at: str = Field(description="Last modification timestamp")


class NoteContent(BaseModel):
    """Note content model."""

    content: str = Field(description="Markdown content")


class NoteCreateRequest(BaseModel):
    """Request to create a new note."""

    paper_id: str = Field(description="Associated paper ID")
    content: str = Field(default="", description="Initial Markdown content")


class NoteUpdateRequest(BaseModel):
    """Request to update a note."""

    content: str = Field(description="New Markdown content")


class NoteResponse(BaseModel):
    """Response for note operations."""

    success: bool
    note: Optional[NoteMetadata] = None
    message: str


class NoteWithContentResponse(BaseModel):
    """Response for note with full content."""

    success: bool
    note: NoteMetadata
    content: str
    html: Optional[str] = None


class NoteListResponse(BaseModel):
    """Response for listing notes."""

    success: bool
    notes: List[NoteMetadata]
    total: int


class HTMLResponseModel(BaseModel):
    """Response with rendered HTML."""

    success: bool
    html: str
    note_id: str


# ============ Helper Functions ============


def get_note_path(paper_id: str) -> Path:
    """Get the note.md path for a paper."""
    settings = get_settings()
    # Sanitize paper_id to prevent path traversal
    safe_id = "".join(c for c in paper_id if c.isalnum() or c in "-_ ")
    return settings.storage.get_note_path(safe_id)


def get_note_metadata(paper_id: str, file_path: Path) -> NoteMetadata:
    """Extract metadata from a note file."""
    file_stat = file_path.stat()

    return NoteMetadata(
        id=paper_id,
        paper_id=paper_id,
        filename=file_path.name,
        file_size=file_stat.st_size,
        created_at=datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
        modified_at=datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
    )


class NoteFileLock:
    """Context manager for atomic file operations."""

    def __init__(self, file_path: Path, mode: str = "r+"):
        self.file_path = file_path
        self.mode = mode
        self.file = None
        self.lock_file = None

    def __enter__(self):
        # Create a separate lock file
        lock_path = Path(str(self.file_path) + ".lock")
        self.lock_file = open(lock_path, "w")
        fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_EX)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.lock_file:
            fcntl.flock(self.lock_file.fileno(), fcntl.LOCK_UN)
            self.lock_file.close()
            # Clean up lock file
            lock_path = Path(str(self.file_path) + ".lock")
            if lock_path.exists():
                lock_path.unlink()


def render_markdown(content: str) -> str:
    """Render Markdown content to HTML."""
    md = markdown.Markdown(
        extensions=[
            "extra",  # Tables, footnotes, etc.
            "codehilite",  # Code syntax highlighting
            "toc",  # Table of contents
        ]
    )
    return md.convert(content)


# ============ API Routes ============


@router.post("/", response_model=NoteWithContentResponse)
async def create_note(request: NoteCreateRequest) -> NoteWithContentResponse:
    """
    Create a new Markdown note for a paper.

    Notes are stored as note.md in each paper's folder.
    """
    settings = get_settings()

    # Sanitize paper_id
    safe_id = "".join(c for c in request.paper_id if c.isalnum() or c in "-_ ")

    # Get paper directory
    paper_dir = settings.storage.get_paper_dir(safe_id)
    paper_dir.mkdir(parents=True, exist_ok=True)

    # Get note path
    note_path = settings.storage.get_note_path(safe_id)

    # Check if note already exists
    if note_path.exists():
        logger.warning(f"Note already exists for paper: {safe_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Note already exists for paper: {safe_id}. Use PUT to update.",
        )

    # Create note with file lock for atomic write
    content = request.content or ""

    try:
        with NoteFileLock(note_path, "w"):
            note_path.write_text(content, encoding="utf-8")

        logger.info(f"Created note for paper: {safe_id}")

        metadata = get_note_metadata(safe_id, note_path)
        html = render_markdown(content)

        return NoteWithContentResponse(
            success=True,
            note=metadata,
            content=content,
            html=html,
        )
    except Exception as e:
        logger.error(f"Error creating note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating note: {str(e)}",
        )


@router.get("/", response_model=NoteListResponse)
async def list_notes(
    paper_id: Optional[str] = Query(
        default=None, description="Filter notes by paper ID"
    ),
) -> NoteListResponse:
    """
    List all notes.

    Optionally filter by paper ID.
    """
    settings = get_settings()

    if not settings.storage.workspace_path.exists():
        return NoteListResponse(success=True, notes=[], total=0)

    notes = []
    for paper_name in settings.storage.list_papers():
        note_path = settings.storage.get_note_path(paper_name)

        if not note_path.exists():
            continue

        # Filter by paper_id if provided
        if paper_id and paper_name != paper_id:
            continue

        try:
            metadata = get_note_metadata(paper_name, note_path)
            notes.append(metadata)
        except Exception as e:
            logger.error(f"Error reading note for {paper_name}: {e}")

    # Sort by modified date, newest first
    notes.sort(key=lambda n: n.modified_at, reverse=True)

    logger.info(f"Listed {len(notes)} notes")
    return NoteListResponse(success=True, notes=notes, total=len(notes))


@router.get("/{paper_id}", response_model=NoteWithContentResponse)
async def get_note(paper_id: str) -> NoteWithContentResponse:
    """
    Get a note by paper ID.

    Returns both Markdown content and rendered HTML.
    """
    note_path = get_note_path(paper_id)

    if not note_path.exists():
        logger.warning(f"No note found for paper: {paper_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No note found for paper: {paper_id}",
        )

    try:
        with NoteFileLock(note_path, "r"):
            content = note_path.read_text(encoding="utf-8")

        metadata = get_note_metadata(paper_id, note_path)
        html = render_markdown(content)

        return NoteWithContentResponse(
            success=True,
            note=metadata,
            content=content,
            html=html,
        )
    except Exception as e:
        logger.error(f"Error reading note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading note: {str(e)}",
        )


@router.get("/{paper_id}/html", response_model=HTMLResponseModel)
async def get_note_html(paper_id: str) -> HTMLResponseModel:
    """
    Get a note rendered as HTML.

    Returns only the HTML for embedding in web views.
    """
    note_path = get_note_path(paper_id)

    if not note_path.exists():
        logger.warning(f"No note found for paper: {paper_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No note found for paper: {paper_id}",
        )

    try:
        with NoteFileLock(note_path, "r"):
            content = note_path.read_text(encoding="utf-8")

        html = render_markdown(content)

        return HTMLResponseModel(
            success=True,
            html=html,
            note_id=paper_id,
        )
    except Exception as e:
        logger.error(f"Error rendering note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rendering note: {str(e)}",
        )


@router.put("/{paper_id}", response_model=NoteWithContentResponse)
async def update_note(
    paper_id: str,
    request: NoteUpdateRequest,
) -> NoteWithContentResponse:
    """
    Update an existing note.

    Uses file locking for atomic write operations.
    """
    note_path = get_note_path(paper_id)

    if not note_path.exists():
        logger.warning(f"No note found for paper: {paper_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No note found for paper: {paper_id}",
        )

    try:
        # Atomic write with file lock
        with NoteFileLock(note_path, "w"):
            note_path.write_text(request.content, encoding="utf-8")

        logger.info(f"Updated note for paper: {paper_id}")

        metadata = get_note_metadata(paper_id, note_path)
        html = render_markdown(request.content)

        return NoteWithContentResponse(
            success=True,
            note=metadata,
            content=request.content,
            html=html,
        )
    except Exception as e:
        logger.error(f"Error updating note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating note: {str(e)}",
        )


@router.patch("/{paper_id}", response_model=NoteWithContentResponse)
async def patch_note(
    paper_id: str,
    request: NoteContent,
) -> NoteWithContentResponse:
    """
    Partially update a note (patch).

    Appends new content to existing note.
    """
    note_path = get_note_path(paper_id)

    if not note_path.exists():
        logger.warning(f"No note found for paper: {paper_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No note found for paper: {paper_id}",
        )

    try:
        with NoteFileLock(note_path, "r+"):
            existing_content = note_path.read_text(encoding="utf-8")

            # Append new content with a separator
            new_content = existing_content
            if new_content and request.content:
                new_content += "\n\n---\n\n"
            new_content += request.content

            note_path.write_text(new_content, encoding="utf-8")

        logger.info(f"Patched note for paper: {paper_id}")

        metadata = get_note_metadata(paper_id, note_path)
        html = render_markdown(new_content)

        return NoteWithContentResponse(
            success=True,
            note=metadata,
            content=new_content,
            html=html,
        )
    except Exception as e:
        logger.error(f"Error patching note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error patching note: {str(e)}",
        )


@router.delete("/{paper_id}", response_model=NoteResponse)
async def delete_note(paper_id: str) -> NoteResponse:
    """
    Delete a note.
    """
    note_path = get_note_path(paper_id)

    if not note_path.exists():
        logger.warning(f"No note found for paper: {paper_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No note found for paper: {paper_id}",
        )

    try:
        note_path.unlink()
        logger.info(f"Deleted note for paper: {paper_id}")

        return NoteResponse(
            success=True,
            message="Note deleted successfully",
        )
    except Exception as e:
        logger.error(f"Error deleting note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting note: {str(e)}",
        )


# Alias for /pdf/{pdf_id} compatibility
@router.get("/paper/{paper_id}", response_model=NoteWithContentResponse)
async def get_note_for_paper(paper_id: str) -> NoteWithContentResponse:
    """Get the note for a specific paper (alias endpoint)."""
    return await get_note(paper_id)
