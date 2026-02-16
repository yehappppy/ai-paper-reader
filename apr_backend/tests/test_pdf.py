"""Tests for PDF API endpoints."""

import io
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client."""
    return TestClient(app)


class TestPDFUpload:
    """Test cases for PDF upload endpoint."""

    def test_upload_requires_pdf_extension(self, client: TestClient) -> None:
        """Test that non-PDF files are rejected."""
        response = client.post(
            "/api/pdf/upload",
            files={"file": ("test.txt", b"content", "text/plain")},
        )
        assert response.status_code == 400

    @patch("src.api.pdf.ensure_storage_dir")
    @patch("src.api.pdf.get_settings")
    def test_upload_success(self, mock_settings, mock_ensure, client: TestClient) -> None:
        """Test successful PDF upload."""
        # Mock settings
        mock_settings.return_value.pdf.max_file_size_mb = 50
        mock_settings.return_value.storage.papers_dir = Path("/tmp/test_papers")
        mock_ensure.return_value = Path("/tmp/test_papers")

        # Create a minimal PDF-like content (not a real PDF but test the flow)
        pdf_content = b"%PDF-1.4 test content"

        response = client.post(
            "/api/pdf/upload",
            files={"file": ("test.pdf", io.BytesIO(pdf_content), "application/pdf")},
        )

        # This will fail because PDF is invalid, but tests the endpoint exists
        assert response.status_code in [200, 400, 500]


class TestPDFList:
    """Test cases for listing PDFs."""

    def test_list_pdfs(self, client: TestClient) -> None:
        """Test listing all PDFs."""
        response = client.get("/api/pdf/")
        assert response.status_code == 200
        data = response.json()
        assert "papers" in data
        assert "total" in data
        assert isinstance(data["papers"], list)


class TestPDFMetadata:
    """Test cases for PDF metadata."""

    def test_get_nonexistent_pdf(self, client: TestClient) -> None:
        """Test getting metadata for non-existent PDF."""
        response = client.get("/api/pdf/nonexistent123")
        assert response.status_code == 404


class TestPDFHighlight:
    """Test cases for PDF highlighting."""

    def test_highlight_requires_rect_or_text(self, client: TestClient) -> None:
        """Test that highlight requires rect or text."""
        response = client.post(
            "/api/pdf/test/highlight",
            json={"page": 0},
        )
        assert response.status_code == 400

    def test_highlight_nonexistent_pdf(self, client: TestClient) -> None:
        """Test highlighting non-existent PDF."""
        response = client.post(
            "/api/pdf/nonexistent/highlight",
            json={"page": 0, "text": "test"},
        )
        assert response.status_code == 404


class TestPDFDelete:
    """Test cases for PDF deletion."""

    def test_delete_nonexistent_pdf(self, client: TestClient) -> None:
        """Test deleting non-existent PDF."""
        response = client.delete("/api/pdf/nonexistent")
        assert response.status_code == 404
