"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {"status": "healthy", "service": "ai-paper-reader"}


@router.get("/health/ready")
async def readiness_check():
    """Readiness check for Kubernetes/containers."""
    return {"status": "ready"}
