"""PDF management API endpoints."""

import hashlib
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import fitz  # PyMuPDF
from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from src.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Pydantic Models ============


class PDFMetadata(BaseModel):
    """PDF metadata model."""

    id: str = Field(description="Unique identifier (file hash)")
    filename: str = Field(description="Original filename")
    title: Optional[str] = Field(default=None, description="PDF title from metadata")
    author: Optional[str] = Field(default=None, description="PDF author")
    subject: Optional[str] = Field(default=None, description="PDF subject")
    creator: Optional[str] = Field(default=None, description="PDF creator")
    producer: Optional[str] = Field(default=None, description="PDF producer")
    page_count: int = Field(description="Number of pages")
    file_size: int = Field(description="File size in bytes")
    created_at: str = Field(description="Creation timestamp")
    modified_at: str = Field(description="Last modification timestamp")


class PDFListResponse(BaseModel):
    """Response for listing PDFs."""

    success: bool
    papers: List[PDFMetadata]
    total: int


class PDFUploadResponse(BaseModel):
    """Response for PDF upload."""

    success: bool
    paper: Optional[PDFMetadata] = None
    message: str


class HighlightPoint(BaseModel):
    """Highlight coordinate point."""

    x: float
    y: float


class HighlightRect(BaseModel):
    """Highlight rectangle coordinates."""

    x0: float
    y0: float
    x1: float
    y1: float


class HighlightRequest(BaseModel):
    """Request to highlight text in a PDF."""

    page: int = Field(ge=0, description="Page number (0-indexed)")
    rect: Optional[HighlightRect] = Field(
        default=None, description="Rectangle coordinates to highlight"
    )
    text: Optional[str] = Field(
        default=None, description="Text to search and highlight"
    )
    color: str = Field(
        default="#ffff00", description="Highlight color (hex format)"
    )
    opacity: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Highlight opacity"
    )
    comment: Optional[str] = Field(
        default=None, description="Optional comment to add"
    )


class HighlightResponse(BaseModel):
    """Response for highlight operation."""

    success: bool
    message: str
    highlight_id: Optional[str] = None
    saved_path: Optional[str] = None


class PDFTextExtraction(BaseModel):
    """Extracted text from PDF."""

    page: int
    text: str


class PDFTextResponse(BaseModel):
    """Response for text extraction."""

    success: bool
    page_count: int
    texts: List[PDFTextExtraction]


# ============ Helper Functions ============


def compute_file_hash(content: bytes) -> str:
    """Compute SHA256 hash of file content."""
    return hashlib.sha256(content).hexdigest()[:16]


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple (0-1 range)."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return (1.0, 1.0, 0.0)  # Default yellow
    r = int(hex_color[0:2], 16) / 255.0
    g = int(hex_color[2:4], 16) / 255.0
    b = int(hex_color[4:6], 16) / 255.0
    return (r, g, b)


def get_pdf_metadata(doc: fitz.Document, file_path: Path) -> PDFMetadata:
    """Extract metadata from a PDF document."""
    metadata = doc.metadata
    file_stat = file_path.stat()

    return PDFMetadata(
        id=file_path.stem,
        filename=file_path.name,
        title=metadata.get("title") or None,
        author=metadata.get("author") or None,
        subject=metadata.get("subject") or None,
        creator=metadata.get("creator") or None,
        producer=metadata.get("producer") or None,
        page_count=len(doc),
        file_size=file_stat.st_size,
        created_at=datetime.fromtimestamp(file_stat.st_ctime).isoformat(),
        modified_at=datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
    )


def ensure_storage_dir() -> Path:
    """Ensure the papers storage directory exists."""
    settings = get_settings()
    # Use workspace root - papers are stored in individual paper folders
    workspace_path = settings.storage.workspace_path
    workspace_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Storage directory ready: {workspace_path}")
    return workspace_path


# ============ API Routes ============


@router.post("/upload", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)) -> PDFUploadResponse:
    """
    Upload and store a PDF paper.

    The PDF is saved to the configured papers directory with a unique ID.
    """
    settings = get_settings()

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Invalid file type attempted: {file.filename}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are allowed",
        )

    # Read file content
    try:
        content = await file.read()
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )

    # Check file size
    max_size = settings.pdf.max_file_size_mb * 1024 * 1024
    if len(content) > max_size:
        logger.warning(f"File exceeds max size: {len(content)} bytes")
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size of {settings.pdf.max_file_size_mb}MB",
        )

    # Compute file hash for unique ID
    file_id = compute_file_hash(content)

    # Ensure storage directory exists
    papers_dir = ensure_storage_dir()

    # Save file
    file_path = papers_dir / f"{file_id}.pdf"
    try:
        file_path.write_bytes(content)
        logger.info(f"PDF saved: {file_path}")
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}",
        )

    # Extract metadata using PyMuPDF
    try:
        doc = fitz.open(stream=content, filetype="pdf")
        metadata = get_pdf_metadata(doc, file_path)
        doc.close()
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
        # Return basic info even if metadata extraction fails
        metadata = PDFMetadata(
            id=file_id,
            filename=file.filename,
            page_count=0,
            file_size=len(content),
            created_at=datetime.now().isoformat(),
            modified_at=datetime.now().isoformat(),
        )

    return PDFUploadResponse(
        success=True,
        paper=metadata,
        message="PDF uploaded successfully",
    )


@router.get("/", response_model=PDFListResponse)
async def list_pdfs() -> PDFListResponse:
    """
    List all stored PDFs.

    Returns metadata for all PDF files in the papers directory.
    """
    papers_dir = ensure_storage_dir()

    papers = []
    for file_path in papers_dir.glob("*.pdf"):
        try:
            doc = fitz.open(file_path)
            metadata = get_pdf_metadata(doc, file_path)
            doc.close()
            papers.append(metadata)
        except Exception as e:
            logger.error(f"Error reading {file_path}: {e}")
            # Add basic info for files that can't be read
            papers.append(
                PDFMetadata(
                    id=file_path.stem,
                    filename=file_path.name,
                    page_count=0,
                    file_size=file_path.stat().st_size,
                    created_at=datetime.now().isoformat(),
                    modified_at=datetime.now().isoformat(),
                )
            )

    # Sort by modified date, newest first
    papers.sort(key=lambda p: p.modified_at, reverse=True)

    logger.info(f"Listed {len(papers)} PDFs")
    return PDFListResponse(success=True, papers=papers, total=len(papers))


@router.get("/{filename}", response_model=PDFMetadata)
async def get_pdf_metadata_by_filename(filename: str) -> PDFMetadata:
    """
    Get metadata for a specific PDF by filename.

    Returns detailed metadata including page count, author, title, etc.
    """
    papers_dir = ensure_storage_dir()

    # Handle with or without .pdf extension
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    file_path = papers_dir / filename

    if not file_path.exists():
        logger.warning(f"PDF not found: {filename}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found: {filename}",
        )

    try:
        doc = fitz.open(file_path)
        metadata = get_pdf_metadata(doc, file_path)
        doc.close()
        logger.info(f"Retrieved metadata for: {filename}")
        return metadata
    except Exception as e:
        logger.error(f"Error reading PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reading PDF: {str(e)}",
        )


@router.get("/{filename}/content")
async def get_pdf_content(filename: str):
    """
    Get the raw PDF content for viewing/rendering.

    Returns the PDF file as a binary response.
    """
    papers_dir = ensure_storage_dir()

    # Handle with or without .pdf extension
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    file_path = papers_dir / filename

    if not file_path.exists():
        logger.warning(f"PDF not found: {filename}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found: {filename}",
        )

    logger.info(f"Serving PDF: {filename}")
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=filename,
    )


@router.get("/{filename}/text", response_model=PDFTextResponse)
async def extract_pdf_text(
    filename: str,
    pages: Optional[str] = Query(
        default=None, description="Page range e.g., '0-5' or '0,2,5'"
    ),
) -> PDFTextResponse:
    """
    Extract text content from a PDF.

    Optionally specify page range: '0-5' for pages 0-5, or '0,2,5' for specific pages.
    """
    papers_dir = ensure_storage_dir()

    # Handle with or without .pdf extension
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    file_path = papers_dir / filename

    if not file_path.exists():
        logger.warning(f"PDF not found: {filename}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found: {filename}",
        )

    try:
        doc = fitz.open(file_path)
        page_count = len(doc)

        # Determine which pages to extract
        page_indices = []
        if pages:
            if "-" in pages:
                start, end = pages.split("-")
                page_indices = list(range(int(start), int(end) + 1))
            elif "," in pages:
                page_indices = [int(p) for p in pages.split(",")]
            else:
                page_indices = [int(pages)]
        else:
            page_indices = list(range(page_count))

        # Extract text from specified pages
        texts = []
        for page_num in page_indices:
            if 0 <= page_num < page_count:
                page = doc[page_num]
                text = page.get_text()
                texts.append(PDFTextExtraction(page=page_num, text=text))

        doc.close()
        logger.info(f"Extracted text from {len(texts)} pages of {filename}")

        return PDFTextResponse(
            success=True,
            page_count=page_count,
            texts=texts,
        )
    except Exception as e:
        logger.error(f"Error extracting text: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error extracting text: {str(e)}",
        )


@router.post("/{filename}/highlight", response_model=HighlightResponse)
async def highlight_pdf_text(
    filename: str,
    highlight: HighlightRequest,
) -> HighlightResponse:
    """
    Highlight text in a PDF.

    Provide either:
    - rect: Specific rectangle coordinates to highlight
    - text: Text to search for and highlight

    The annotated PDF is saved back to disk with '_annotated' suffix.
    """
    papers_dir = ensure_storage_dir()

    # Handle with or without .pdf extension
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    file_path = papers_dir / filename

    if not file_path.exists():
        logger.warning(f"PDF not found: {filename}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found: {filename}",
        )

    try:
        doc = fitz.open(file_path)

        # Validate page number
        if highlight.page < 0 or highlight.page >= len(doc):
            doc.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page number. PDF has {len(doc)} pages (0-{len(doc)-1})",
            )

        page = doc[highlight.page]

        # Convert hex color to RGB
        color = hex_to_rgb(highlight.color)

        highlight_id = None

        if highlight.rect:
            # Use provided rectangle coordinates
            rect = fitz.Rect(
                highlight.rect.x0,
                highlight.rect.y0,
                highlight.rect.x1,
                highlight.rect.y1,
            )
            # Add highlight annotation
            annot = page.add_highlight_annot(rect)
            annot.set_colors(stroke=color)
            annot.set_opacity(highlight.opacity)
            if highlight.comment:
                annot.set_info(content=highlight.comment)
            annot.update()
            highlight_id = annot.rect_id
            logger.info(f"Added highlight at rect {rect} on page {highlight.page}")

        elif highlight.text:
            # Search for text and highlight all instances
            text_instances = page.search_for(highlight.text)

            if not text_instances:
                doc.close()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Text '{highlight.text}' not found on page {highlight.page}",
                )

            for rect in text_instances:
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=color)
                annot.set_opacity(highlight.opacity)
                if highlight.comment:
                    annot.set_info(content=highlight.comment)
                annot.update()
                highlight_id = annot.rect_id

            logger.info(
                f"Highlighted {len(text_instances)} instances of '{highlight.text}' "
                f"on page {highlight.page}"
            )
        else:
            doc.close()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either 'rect' or 'text' must be provided",
            )

        # Save annotated PDF
        # Create annotated version filename
        base_name = file_path.stem
        annotated_path = papers_dir / f"{base_name}_annotated.pdf"

        doc.save(str(annotated_path))
        doc.close()

        logger.info(f"Saved annotated PDF to: {annotated_path}")

        return HighlightResponse(
            success=True,
            message="Highlight added successfully",
            highlight_id=str(highlight_id) if highlight_id else None,
            saved_path=str(annotated_path.name),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding highlight: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding highlight: {str(e)}",
        )


@router.delete("/{filename}", response_model=PDFUploadResponse)
async def delete_pdf(filename: str) -> PDFUploadResponse:
    """
    Delete a PDF from storage.
    """
    papers_dir = ensure_storage_dir()

    # Handle with or without .pdf extension
    if not filename.endswith(".pdf"):
        filename = f"{filename}.pdf"

    file_path = papers_dir / filename

    if not file_path.exists():
        logger.warning(f"PDF not found for deletion: {filename}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"PDF not found: {filename}",
        )

    try:
        file_path.unlink()
        logger.info(f"Deleted PDF: {filename}")

        # Also try to delete annotated version if exists
        annotated_path = papers_dir / f"{file_path.stem}_annotated.pdf"
        if annotated_path.exists():
            annotated_path.unlink()
            logger.info(f"Deleted annotated version: {annotated_path.name}")

        return PDFUploadResponse(
            success=True,
            message="PDF deleted successfully",
        )
    except Exception as e:
        logger.error(f"Error deleting PDF: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting PDF: {str(e)}",
        )
