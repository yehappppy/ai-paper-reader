"""Tests for the main FastAPI application."""

import pytest
from fastapi.testclient import TestClient

from src.main import app, create_app


class TestMainApp:
    """Test cases for the main application."""

    @pytest.fixture
    def client(self) -> TestClient:
        """Create a test client."""
        return TestClient(app)

    def test_app_created(self) -> None:
        """Test that the app is created successfully."""
        assert app is not None
        assert app.title == "AI Paper Reader"

    def test_health_endpoint(self, client: TestClient) -> None:
        """Test the health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_cors_headers(self, client: TestClient) -> None:
        """Test CORS headers are set."""
        response = client.options(
            "/api/health",
            headers={"Origin": "http://localhost:3000"},
        )
        assert "access-control-allow-origin" in response.headers


class TestAppFactory:
    """Test cases for the app factory function."""

    def test_create_app(self) -> None:
        """Test creating app via factory function."""
        test_app = create_app()
        assert test_app is not None
        assert test_app.title == "AI Paper Reader"

    def test_routers_registered(self) -> None:
        """Test that all routers are registered."""
        test_app = create_app()

        # Check routes exist
        routes = [route.path for route in test_app.routes]

        assert "/api/health" in routes
        assert "/api/papers" in routes
        assert "/api/pdf" in routes
        assert "/api/notes" in routes
        assert "/api/ai" in routes
        assert "/api/chat" in routes
