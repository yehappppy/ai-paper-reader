"""LLM integration module."""

from functools import lru_cache

from langchain_openai import ChatOpenAI
from langchain_core.runnables import Runnable
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from src.config import get_settings


def get_llm() -> ChatOpenAI:
    """Get the configured LLM instance."""
    settings = get_settings()

    if settings.llm.provider == "openai":
        llm = ChatOpenAI(
            model=settings.llm.model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
            api_key=settings.llm.openai_api_key,
            base_url=settings.llm.openai_base_url,
        )
    elif settings.llm.provider == "grok":
        llm = ChatOpenAI(
            model=settings.llm.model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
            api_key=settings.llm.grok_api_key,
            base_url=settings.llm.grok_base_url,
        )
    elif settings.llm.provider == "minimax":
        llm = ChatOpenAI(
            model=settings.llm.model,
            temperature=settings.llm.temperature,
            max_tokens=settings.llm.max_tokens,
            api_key=settings.llm.minimax_api_key,
            base_url=settings.llm.minimax_base_url,
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {settings.llm.provider}")

    return llm


@lru_cache
def get_llm_chain() -> Runnable:
    """Get the LLM chain for chat."""
    llm = get_llm()

    # Create the prompt template
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", "You are an AI assistant helping users understand research papers. {context}"),
            MessagesPlaceholder(variable_name="messages"),
        ]
    )

    # Create the chain
    chain = prompt | llm

    return chain


def extract_text_from_pdf(pdf_path: str, max_pages: int = 10) -> str:
    """Extract text content from a PDF for context."""
    import fitz

    doc = fitz.open(pdf_path)
    text_parts = []

    for page_num in range(min(len(doc), max_pages)):
        page = doc[page_num]
        text_parts.append(page.get_text())

    doc.close()

    return "\n\n".join(text_parts)


def extract_text_from_pdf_by_id(pdf_id: str, max_pages: int = 20) -> str:
    """Extract text from a PDF by its ID."""
    settings = get_settings()
    papers_dir = settings.storage.papers_dir

    # Try both with and without extension
    pdf_path = papers_dir / f"{pdf_id}.pdf"
    if not pdf_path.exists():
        pdf_path = papers_dir / pdf_id

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_id}")

    return extract_text_from_pdf(str(pdf_path), max_pages=max_pages)
