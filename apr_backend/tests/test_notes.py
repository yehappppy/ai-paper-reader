"""Tests for Notes API endpoints."""

import pytest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client."""
    return TestClient(app)


class TestNoteCreate:
    """Test cases for creating notes."""

    def test_create_note(self, client: TestClient) -> None:
        """Test creating a new note."""
        response = client.post(
            "/api/notes/",
            json={"pdf_id": "test_note_123", "content": "# Test Note\n\nTest content"},
        )
        # May succeed or conflict depending on existing notes
        assert response.status_code in [200, 409]

    def test_create_note_empty_content(self, client: TestClient) -> None:
        """Test creating note with empty content."""
        response = client.post(
            "/api/notes/",
            json={"content": ""},
        )
        assert response.status_code in [200, 409]


class TestNoteList:
    """Test cases for listing notes."""

    def test_list_notes(self, client: TestClient) -> None:
        """Test listing all notes."""
        response = client.get("/api/notes/")
        assert response.status_code == 200
        data = response.json()
        assert "notes" in data
        assert "total" in data
        assert isinstance(data["notes"], list)

    def test_list_notes_with_pdf_filter(self, client: TestClient) -> None:
        """Test filtering notes by PDF ID."""
        response = client.get("/api/notes/?pdf_id=test123")
        assert response.status_code == 200


class TestNoteGet:
    """Test cases for getting notes."""

    def test_get_nonexistent_note(self, client: TestClient) -> None:
        """Test getting non-existent note."""
        response = client.get("/api/notes/nonexistent_note_xyz")
        assert response.status_code == 404


class TestNoteUpdate:
    """Test cases for updating notes."""

    def test_update_nonexistent_note(self, client: TestClient) -> None:
        """Test updating non-existent note."""
        response = client.put(
            "/api/notes/nonexistent_note_xyz",
            json={"content": "Updated content"},
        )
        assert response.status_code == 404


class TestNoteDelete:
    """Test cases for deleting notes."""

    def test_delete_nonexistent_note(self, client: TestClient) -> None:
        """Test deleting non-existent note."""
        response = client.delete("/api/notes/nonexistent_note_xyz")
        assert response.status_code == 404


class TestNoteForPDF:
    """Test cases for getting notes associated with PDFs."""

    def test_get_note_for_nonexistent_pdf(self, client: TestClient) -> None:
        """Test getting note for non-existent PDF."""
        response = client.get("/api/notes/pdf/nonexistent_pdf_xyz")
        assert response.status_code == 404
