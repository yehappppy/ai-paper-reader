# AI Paper Reader

An AI-powered research paper reader with LLM integration for summarization and Q&A.

## Features

- PDF upload and management
- Text extraction from PDFs
- AI-powered chat assistant for paper analysis
- Configurable LLM providers (OpenAI, Grok, Anthropic)
- RESTful API with FastAPI

## Quick Start

### Prerequisites

- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager

### Setup

```bash
# Initialize the project
uv init

# Sync dependencies
uv sync

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys
```

### Running the Server

```bash
# Development mode with auto-reload
uv run uvicorn src.main:app --reload

# Or use the convenience script
uv run python bin/run_server.py
```

The API will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Configuration

Configuration is managed via `conf/app_config.yaml`. Key settings:

```yaml
# LLM Configuration
llm:
  provider: "openai"  # openai, grok, anthropic
  model: "gpt-4o-mini"
  temperature: 0.7

# Storage paths
storage:
  pdf_dir: "./data/pdfs"
  notes_dir: "./data/notes"
  cache_dir: "./data/cache"
```

### Environment Variables

Create a `.env` file with your API keys:

```bash
OPENAI_API_KEY=your_openai_key_here
GROK_API_KEY=your_grok_key_here
```

## Project Structure

```
apr_backend/
├── bin/                    # Executable scripts
│   ├── run_server.py      # Server runner
│   └── extract_pdf.py     # PDF text extraction tool
├── conf/                  # Configuration files
│   └── app_config.yaml   # Main app configuration
├── src/                   # Source code
│   ├── __init__.py
│   ├── main.py           # FastAPI app entry point
│   ├── config.py         # Configuration management
│   ├── llm.py            # LLM integration
│   └── api/              # API routers
│       ├── __init__.py
│       ├── health.py     # Health check endpoints
│       ├── papers.py     # Paper management
│       └── chat.py       # Chat/assistant endpoints
├── data/                  # Runtime data (created on first run)
│   ├── pdfs/
│   ├── notes/
│   └── cache/
├── tests/                 # Test files
├── pyproject.toml        # Project dependencies
└── README.md
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/papers/upload` | POST | Upload a PDF |
| `/api/papers/` | GET | List all papers |
| `/api/papers/{id}` | GET | Get paper details |
| `/api/papers/{id}/content` | GET | Get PDF content |
| `/api/papers/{id}` | DELETE | Delete a paper |
| `/api/chat/` | POST | Chat with AI assistant |
| `/api/chat/models` | GET | List available models |

## Development

```bash
# Run tests
uv run pytest

# Format code
uv run ruff check --fix
uv run ruff format
```

## License

MIT
