"""Tests for AI API endpoints."""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client."""
    return TestClient(app)


class TestAIAsk:
    """Test cases for AI ask endpoint."""

    def test_ask_requires_query(self, client: TestClient) -> None:
        """Test that query is required."""
        response = client.post("/api/ai/ask", json={})
        assert response.status_code == 422  # Validation error

    def test_ask_empty_query(self, client: TestClient) -> None:
        """Test that empty query is rejected."""
        response = client.post("/api/ai/ask", json={"query": ""})
        assert response.status_code == 400

    def test_ask_with_query(self, client: TestClient) -> None:
        """Test asking with a query (will fail without API key)."""
        response = client.post(
            "/api/ai/ask",
            json={"query": "What is a transformer?"},
        )
        # Should get an error response (not 422/400) since query is valid
        # but API call will fail without valid credentials
        assert response.status_code in [200, 401, 500, 503]


class TestAIModels:
    """Test cases for listing models."""

    def test_list_models(self, client: TestClient) -> None:
        """Test listing available models."""
        response = client.get("/api/ai/models")
        assert response.status_code == 200
        data = response.json()
        assert "provider" in data
        assert "model" in data
        assert "available_providers" in data


class TestAISummarize:
    """Test cases for summarization endpoint."""

    def test_summarize_requires_content(self, client: TestClient) -> None:
        """Test that summarization requires content or PDF."""
        response = client.post("/api/ai/summarize", json={})
        assert response.status_code == 400

    def test_summarize_with_text(self, client: TestClient) -> None:
        """Test summarizing provided text."""
        response = client.post(
            "/api/ai/summarize",
            json={
                "context": "This is a long piece of text that needs to be summarized. "
                * 10
            },
        )
        # May succeed or fail depending on API availability
        assert response.status_code in [200, 401, 500, 503]
