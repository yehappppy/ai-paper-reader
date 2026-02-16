"""Main FastAPI application entry point.

AI Paper Reader Backend - A FastAPI application for managing research papers,
notes, and AI-powered assistance.
"""

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.api import papers, chat, health, pdf, notes, ai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> Any:
    """Application lifespan handler for startup and shutdown events."""
    settings = get_settings()

    # Startup: ensure workspace root directory exists
    logger.info("Initializing storage directories...")
    settings.storage.workspace_path.mkdir(parents=True, exist_ok=True)

    logger.info(f"App '{settings.app_name}' v{settings.version} started")
    logger.info(f"Workspace directory: {settings.storage.workspace_path}")
    logger.info(f"LLM provider: {settings.llm.provider} ({settings.llm.model})")

    yield

    # Shutdown
    logger.info("Shutting down application...")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Sets up:
    - CORS middleware for frontend integration
    - All API routers (health, papers, pdf, notes, ai, chat)
    - Lifespan handler for startup/shutdown events

    Returns:
        Configured FastAPI application instance.
    """
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.version,
        description="AI-powered research paper reader with notes and AI assistance",
        debug=settings.debug,
        lifespan=lifespan,
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.api.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(papers.router, prefix="/api/papers", tags=["papers"])
    app.include_router(pdf.router, prefix="/api/pdf", tags=["pdf"])
    app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
    app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    app.include_router(chat.router, prefix="/api/chat", tags=["chat"])

    return app


app = create_app()
