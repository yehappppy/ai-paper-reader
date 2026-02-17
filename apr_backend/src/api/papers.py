"""Paper/PDF management endpoints."""

import hashlib
import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel

from src.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


def generate_thumbnail(paper_dir: Path, content: bytes) -> str | None:
    """Generate a thumbnail from the first page of the PDF."""
    try:
        import fitz
        from PIL import Image
        import io

        # Open PDF from bytes
        doc = fitz.open(stream=content, filetype="pdf")
        if len(doc) == 0:
            doc.close()
            return None

        # Get first page
        page = doc[0]
        # Render at higher resolution for better quality
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        doc.close()

        # Convert to PIL Image
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        # Resize to thumbnail size (300px width, maintain aspect ratio)
        thumbnail_width = 300
        aspect_ratio = img.height / img.width
        thumbnail_height = int(thumbnail_width * aspect_ratio)
        img = img.resize((thumbnail_width, thumbnail_height), Image.Resampling.LANCZOS)

        # Save thumbnail
        thumbnail_path = paper_dir / "thumbnail.jpg"
        img.save(thumbnail_path, "JPEG", quality=85, optimize=True)

        return f"/api/papers/{paper_dir.name}/thumbnail.jpg"
    except Exception as e:
        logger.warning(f"Failed to generate thumbnail: {e}")
        return None


class PaperMetadata(BaseModel):
    """Paper metadata model."""

    id: str
    name: str
    title: str | None = None
    author: str | None = None
    page_count: int = 0
    file_size: int = 0
    thumbnail_url: str | None = None
    upload_date: str | None = None


class PaperResponse(BaseModel):
    """Response model for paper operations."""

    success: bool
    paper: PaperMetadata | None = None
    message: str | None = None


class ArxivPaper(BaseModel):
    """ArXiv paper model."""

    id: str
    title: str
    authors: List[str]
    abstract: str
    published: str
    pdf_url: str


@router.post("/upload", response_model=PaperResponse)
async def upload_paper(file: UploadFile = File(...)) -> PaperResponse:
    """Upload a PDF paper.

    Creates a new folder named after the paper (sanitized from filename)
    and saves the PDF as paper.pdf inside it.
    """
    settings = get_settings()

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    # Read file content
    content = await file.read()

    # Check file size
    max_size = settings.pdf.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LOCUM,
            detail=f"File exceeds maximum size of {settings.pdf.max_file_size_mb}MB",
        )

    # Generate paper name from filename (without extension)
    paper_name = Path(file.filename).stem
    # Sanitize paper name
    safe_name = "".join(c for c in paper_name if c.isalnum() or c in "-_ ")

    # Get paper directory
    paper_dir = settings.storage.get_paper_dir(safe_name)
    paper_dir.mkdir(parents=True, exist_ok=True)

    # Save file as paper.pdf
    paper_path = settings.storage.get_paper_path(safe_name)
    paper_path.write_bytes(content)

    # Extract basic metadata and generate thumbnail using PyMuPDF
    thumbnail_url = None
    try:
        import fitz  # PyMuPDF

        doc = fitz.open(stream=content, filetype="pdf")
        page_count = len(doc)
        metadata = doc.metadata

        # Generate thumbnail
        thumbnail_url = generate_thumbnail(paper_dir, content)

        doc.close()
    except Exception:
        page_count = 0
        metadata = {}

    # Use current time as upload date for new uploads
    from datetime import datetime, timezone
    upload_date = datetime.now(timezone.utc).isoformat()

    paper = PaperMetadata(
        id=safe_name,
        name=safe_name,
        title=metadata.get("title") or paper_name,
        author=metadata.get("author"),
        page_count=page_count,
        file_size=len(content),
        thumbnail_url=thumbnail_url,
        upload_date=upload_date,
    )

    return PaperResponse(success=True, paper=paper, message="Paper uploaded successfully")


@router.get("/", response_model=List[PaperMetadata])
async def list_papers() -> List[PaperMetadata]:
    """List all papers in the workspace."""
    settings = get_settings()

    if not settings.storage.workspace_path.exists():
        return []

    from datetime import datetime, timezone

    papers = []
    for paper_name in settings.storage.list_papers():
        paper_path = settings.storage.get_paper_path(paper_name)
        paper_dir = settings.storage.get_paper_dir(paper_name)

        # Check if thumbnail exists
        thumbnail_path = paper_dir / "thumbnail.jpg"
        thumbnail_url = f"/api/papers/{paper_name}/thumbnail.jpg" if thumbnail_path.exists() else None

        # Get file modification time as upload date
        mtime = paper_path.stat().st_mtime
        upload_date = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

        try:
            import fitz

            doc = fitz.open(paper_path)
            metadata = doc.metadata
            page_count = len(doc)
            doc.close()

            papers.append(
                PaperMetadata(
                    id=paper_name,
                    name=paper_name,
                    title=metadata.get("title") or paper_name,
                    author=metadata.get("author"),
                    page_count=page_count,
                    file_size=paper_path.stat().st_size,
                    thumbnail_url=thumbnail_url,
                    upload_date=upload_date,
                )
            )
        except Exception:
            papers.append(
                PaperMetadata(
                    id=paper_name,
                    name=paper_name,
                    page_count=0,
                    file_size=paper_path.stat().st_size,
                    thumbnail_url=thumbnail_url,
                    upload_date=upload_date,
                )
            )

    return papers


@router.get("/search", response_model=List[PaperMetadata])
async def search_papers(q: str = Query(..., description="Search query")) -> List[PaperMetadata]:
    """Search papers by title or author."""
    settings = get_settings()

    if not settings.storage.workspace_path.exists():
        return []

    from datetime import datetime, timezone

    query = q.lower()
    papers = []

    for paper_name in settings.storage.list_papers():
        paper_path = settings.storage.get_paper_path(paper_name)
        paper_dir = settings.storage.get_paper_dir(paper_name)

        # Check if thumbnail exists
        thumbnail_path = paper_dir / "thumbnail.jpg"
        thumbnail_url = f"/api/papers/{paper_name}/thumbnail.jpg" if thumbnail_path.exists() else None

        # Get file modification time as upload date
        mtime = paper_path.stat().st_mtime
        upload_date = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

        try:
            import fitz

            doc = fitz.open(paper_path)
            metadata = doc.metadata
            page_count = len(doc)
            doc.close()

            title = (metadata.get("title") or "").lower()
            author = (metadata.get("author") or "").lower()

            # Search in title, author, or paper name
            if query in title or query in author or query in paper_name.lower():
                papers.append(
                    PaperMetadata(
                        id=paper_name,
                        name=paper_name,
                        title=metadata.get("title") or paper_name,
                        author=metadata.get("author"),
                        page_count=page_count,
                        file_size=paper_path.stat().st_size,
                        thumbnail_url=thumbnail_url,
                        upload_date=upload_date,
                    )
                )
        except Exception:
            # Include if paper name matches
            if query in paper_name.lower():
                papers.append(
                    PaperMetadata(
                        id=paper_name,
                        name=paper_name,
                        page_count=0,
                        file_size=paper_path.stat().st_size,
                        thumbnail_url=thumbnail_url,
                        upload_date=upload_date,
                    )
                )

    return papers


@router.get("/categories", response_model=List[str])
async def list_categories() -> List[str]:
    """List available paper categories."""
    # Placeholder - could be implemented with actual category tracking
    return ["machine-learning", "nlp", "computer-vision", "reinforcement-learning"]


# ============ ArXiv Endpoints ============
# IMPORTANT: These must come BEFORE /{paper_id} to avoid route conflicts

@router.get("/arxiv/search", response_model=List[ArxivPaper])
async def search_arxiv(
    q: str = Query(..., description="Search query"),
    max_results: int = Query(10, description="Maximum results"),
) -> List[ArxivPaper]:
    """Search arXiv for papers."""
    # Placeholder implementation - would need arxiv API integration
    logger.info(f"ArXiv search: {q}, max_results: {max_results}")
    return []


@router.get("/arxiv/{paper_id}", response_model=ArxivPaper)
async def get_arxiv_paper(paper_id: str) -> ArxivPaper:
    """Get an arXiv paper by ID."""
    # Placeholder implementation
    raise HTTPException(status_code=404, detail="ArXiv integration not implemented")


@router.post("/arxiv/{paper_id}/download", response_model=PaperResponse)
async def download_arxiv_paper(paper_id: str) -> PaperResponse:
    """Download an arXiv paper."""
    # Placeholder implementation
    raise HTTPException(status_code=404, detail="ArXiv integration not implemented")


# ============ Paper ID endpoints (must come last) ============

@router.get("/{paper_id}", response_model=PaperResponse)
async def get_paper(paper_id: str) -> PaperResponse:
    """Get a specific paper by ID (folder name)."""
    settings = get_settings()
    paper_path = settings.storage.get_paper_path(paper_id)
    paper_dir = settings.storage.get_paper_dir(paper_id)

    if not paper_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    # Check if thumbnail exists
    thumbnail_path = paper_dir / "thumbnail.jpg"
    thumbnail_url = f"/api/papers/{paper_id}/thumbnail.jpg" if thumbnail_path.exists() else None

    # Get file modification time as upload date
    from datetime import datetime, timezone
    mtime = paper_path.stat().st_mtime
    upload_date = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

    try:
        import fitz

        doc = fitz.open(paper_path)
        metadata = doc.metadata
        page_count = len(doc)
        doc.close()

        paper = PaperMetadata(
            id=paper_id,
            name=paper_id,
            title=metadata.get("title") or paper_id,
            author=metadata.get("author"),
            page_count=page_count,
            file_size=paper_path.stat().st_size,
            thumbnail_url=thumbnail_url,
            upload_date=upload_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading paper: {str(e)}",
        )

    return PaperResponse(success=True, paper=paper)


@router.get("/{paper_id}/content")
async def get_paper_content(paper_id: str):
    """Get the raw PDF content for rendering."""
    settings = get_settings()
    paper_path = settings.storage.get_paper_path(paper_id)

    if not paper_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    from fastapi.responses import FileResponse

    return FileResponse(paper_path, media_type="application/pdf")


@router.get("/{paper_id}/thumbnail.jpg")
async def get_paper_thumbnail(paper_id: str):
    """Get the paper thumbnail."""
    settings = get_settings()
    paper_dir = settings.storage.get_paper_dir(paper_id)
    thumbnail_path = paper_dir / "thumbnail.jpg"

    if not thumbnail_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thumbnail not found",
        )

    from fastapi.responses import FileResponse

    return FileResponse(thumbnail_path, media_type="image/jpeg")


@router.delete("/{paper_id}", response_model=PaperResponse)
async def delete_paper(paper_id: str) -> PaperResponse:
    """Delete a paper (entire folder)."""
    settings = get_settings()
    paper_dir = settings.storage.get_paper_dir(paper_id)

    if not paper_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper not found",
        )

    # Delete the entire paper folder
    import shutil
    shutil.rmtree(paper_dir)

    return PaperResponse(success=True, message="Paper deleted successfully")
