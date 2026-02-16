"""Chat endpoints for AI assistant."""

import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.llm import get_llm_chain

router = APIRouter()


# ============ Models ============

class ChatMessage(BaseModel):
    """Chat message model."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Chat request model."""

    message: str
    paper_id: str | None = None
    history: list[ChatMessage] = []


class ChatResponse(BaseModel):
    """Chat response model."""

    success: bool
    response: str
    sources: list[str] = []


class ChatSession(BaseModel):
    """Chat session model."""

    id: str
    paper_id: str | None = None
    title: str
    created_at: str
    updated_at: str


class CreateSessionRequest(BaseModel):
    """Request to create a chat session."""

    paper_id: str | None = None
    title: str = "New Chat"


class SendMessageRequest(BaseModel):
    """Request to send a message."""

    content: str


# ============ In-memory session storage (for demo) ============

chat_sessions: dict[str, ChatSession] = {}


# ============ Endpoints ============

@router.post("/sessions", response_model=ChatSession)
async def create_session(request: CreateSessionRequest) -> ChatSession:
    """Create a new chat session."""
    session_id = str(uuid.uuid4())
    now = "2024-01-01T00:00:00Z"  # Simplified timestamp

    session = ChatSession(
        id=session_id,
        paper_id=request.paper_id,
        title=request.title,
        created_at=now,
        updated_at=now,
    )

    chat_sessions[session_id] = session
    return session


@router.get("/sessions", response_model=List[ChatSession])
async def list_sessions() -> List[ChatSession]:
    """List all chat sessions."""
    return list(chat_sessions.values())


@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_session(session_id: str) -> ChatSession:
    """Get a specific chat session."""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return chat_sessions[session_id]


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str) -> dict:
    """Delete a chat session."""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    del chat_sessions[session_id]
    return {"success": True, "message": "Session deleted"}


@router.post("/sessions/{session_id}/messages", response_model=ChatMessage)
async def send_message(session_id: str, request: SendMessageRequest) -> ChatMessage:
    """Send a message in a chat session."""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    session = chat_sessions[session_id]

    try:
        chain = get_llm_chain()

        # Build context
        context = ""
        if session.paper_id:
            context = f"Paper ID: {session.paper_id}\n"

        # Build messages for the chain
        messages = [{"role": "user", "content": request.content}]

        # Run the chain
        result = chain.invoke({"messages": messages, "context": context})

        response_content = result.get("response", "No response generated")

        # Create assistant message
        assistant_msg = ChatMessage(role="assistant", content=response_content)

        return ChatMessage(role="user", content=request.content)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}",
        )


@router.post("/ask", response_model=ChatResponse)
async def chat_ask(request: ChatRequest) -> ChatResponse:
    """Ask a question in the context of a paper."""
    try:
        chain = get_llm_chain()

        # Build conversation context
        context = ""
        if request.paper_id:
            # TODO: Load paper content and extract relevant sections
            context = f"Paper ID: {request.paper_id}\n"

        # Build messages for the chain
        messages = []
        for msg in request.history:
            messages.append({"role": msg.role, "content": msg.content})

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Run the chain
        result = chain.invoke({"messages": messages, "context": context})

        return ChatResponse(
            success=True,
            response=result.get("response", "No response generated"),
            sources=result.get("sources", []),
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}",
        )


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    """Send a message to the AI assistant."""
    return await chat_ask(request)
