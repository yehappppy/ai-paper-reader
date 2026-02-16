"""AI Assistant API endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from src.config import get_settings

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()


# ============ Pydantic Models ============


class AskRequest(BaseModel):
    """Request to ask the AI assistant."""

    query: str = Field(..., description="User's question or query")
    context: Optional[str] = Field(
        default=None,
        description="Optional context (e.g., selected PDF text, notes)",
    )
    pdf_id: Optional[str] = Field(
        default=None,
        description="Optional PDF ID to fetch context from",
    )
    system_prompt: Optional[str] = Field(
        default=None,
        description="Optional custom system prompt",
    )


class AskResponse(BaseModel):
    """Response from the AI assistant."""

    success: bool
    query: str
    response: str
    context_used: bool = False
    model: str
    provider: str
    usage: Optional[dict] = None
    error: Optional[str] = None


# ============ Helper Functions ============


def get_llm():
    """Get the configured LLM instance."""
    from src.llm import get_llm as _get_llm
    return _get_llm()


def fetch_pdf_context(pdf_id: str, max_pages: int = 20) -> str:
    """Fetch text context from a PDF."""
    from src.llm import extract_text_from_pdf_by_id
    try:
        return extract_text_from_pdf_by_id(pdf_id, max_pages=max_pages)
    except Exception as e:
        logger.warning(f"Could not fetch PDF context: {e}")
        return ""


def build_prompt(query: str, context: Optional[str], pdf_context: Optional[str]) -> tuple[str, bool]:
    """
    Build the prompt with context.

    Returns (system_prompt, context_used) tuple.
    """
    # Combine contexts if both provided
    combined_context = []
    context_used = False

    if context:
        combined_context.append(context)
        context_used = True

    if pdf_context:
        combined_context.append(f"From the research paper:\n{pdf_context}")
        context_used = True

    context_str = ""
    if combined_context:
        context_str = "\n\n".join(combined_context)
        context_str = f"Use the following context to answer questions:\n\n{context_str}\n\n"

    system_prompt = f"""You are an AI expert specializing in explaining concepts from research papers.
Your role is to help users understand complex technical concepts, paper methodologies, and findings.

Guidelines:
- Be clear and precise in your explanations
- Use examples when helpful
- If the context doesn't contain enough information to answer, say so
- Break down complex concepts into digestible parts
- Use proper technical terminology but explain it

{context_str}Now answer the following question:"""

    return system_prompt, context_used


# ============ API Routes ============


@router.post("/ask", response_model=AskResponse)
async def ask_ai(request: AskRequest) -> AskResponse:
    """
    Ask the AI assistant a question.

    Supports:
    - Direct queries with optional context text
    - PDF-based context (fetches text from specified PDF)
    - Custom system prompts for specialized behavior
    """
    settings = get_settings()

    # Validate query
    if not request.query or not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query cannot be empty",
        )

    # Get PDF context if pdf_id provided
    pdf_context = None
    if request.pdf_id:
        pdf_context = fetch_pdf_context(request.pdf_id)
        if not pdf_context:
            logger.warning(f"No context found for PDF: {request.pdf_id}")

    # Build the prompt
    system_prompt, context_used = build_prompt(
        request.query,
        request.context,
        pdf_context,
    )

    # Use custom system prompt if provided
    if request.system_prompt:
        system_prompt = request.system_prompt

    try:
        # Get the LLM
        llm = get_llm()

        # Call the LLM with the prompt
        from langchain_core.messages import HumanMessage
        from langchain_core.prompts import ChatPromptTemplate

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{query}"),
        ])

        chain = prompt | llm

        # Invoke the chain
        result = chain.invoke({"query": request.query})

        response_text = result.content if hasattr(result, 'content') else str(result)

        # Extract usage if available
        usage = None
        if hasattr(result, 'usage_metadata'):
            usage = result.usage_metadata

        logger.info(f"AI query answered: {request.query[:50]}...")

        return AskResponse(
            success=True,
            query=request.query,
            response=response_text,
            context_used=context_used,
            model=settings.llm.model,
            provider=settings.llm.provider,
            usage=usage,
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"AI query error: {error_msg}")

        # Handle specific error types
        if "rate_limit" in error_msg.lower() or "429" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
            )
        elif "authentication" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key. Please check your configuration.",
            )
        elif "insufficient_quota" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="API quota exceeded. Please check your account.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error processing your request: {error_msg}",
            )


@router.get("/models")
async def list_models():
    """List available LLM models and current configuration."""
    settings = get_settings()

    return {
        "success": True,
        "provider": settings.llm.provider,
        "model": settings.llm.model,
        "temperature": settings.llm.temperature,
        "max_tokens": settings.llm.max_tokens,
        "available_providers": ["openai", "grok", "minimax"],
    }


@router.post("/summarize")
async def summarize_text(request: AskRequest) -> AskResponse:
    """
    Summarize the provided text or PDF content.
    """
    settings = get_settings()

    # Build context for summarization
    context = request.context or ""
    pdf_context = None

    if request.pdf_id:
        pdf_context = fetch_pdf_context(request.pdf_id, max_pages=50)

    combined_context = pdf_context or context

    if not combined_context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text or PDF provided to summarize",
        )

    # Build summarization prompt
    system_prompt = """You are an expert at summarizing research papers and technical content.

Your task is to provide a clear, concise summary that includes:
- Main topic/focus
- Key findings or contributions
- Important methodologies (briefly)
- Conclusions

Keep it concise but informative. Use bullet points for clarity."""

    human_prompt = f"""Please summarize the following content:

{combined_context}

Summary:"""

    try:
        llm = get_llm()

        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.messages import HumanMessage

        prompt = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{text}"),
        ])

        chain = prompt | llm

        # Limit text length to avoid token limits
        text_to_summarize = combined_context[:15000]

        result = chain.invoke({"text": text_to_summarize})

        response_text = result.content if hasattr(result, 'content') else str(result)

        logger.info("Text summarized successfully")

        return AskResponse(
            success=True,
            query=request.query or "Summarize content",
            response=response_text,
            context_used=True,
            model=settings.llm.model,
            provider=settings.llm.provider,
        )

    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error summarizing content: {str(e)}",
        )
