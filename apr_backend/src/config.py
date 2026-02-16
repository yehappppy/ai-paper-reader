"""Configuration management."""

import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings
import yaml

# Load environment variables from .env file
load_dotenv()


class StorageSettings(BaseSettings):
    """Storage configuration."""

    # Root directory containing paper folders
    # Each paper folder contains: a PDF file and optionally a note.md file
    workspace_root: Path = Field(default=Path("./workspaces"))

    def __init__(self, **data):
        super().__init__(**data)
        # Expand ~ to home directory
        if self.workspace_root and str(self.workspace_root).startswith("~"):
            self.workspace_root = Path(os.path.expanduser(str(self.workspace_root)))

    @property
    def workspace_path(self) -> Path:
        """Get the workspace root path."""
        return self.workspace_root

    def get_paper_dir(self, paper_name: str) -> Path:
        """Get the directory for a specific paper."""
        # Don't sanitize - use the folder name directly
        # Sanitization is only for user-provided names when creating new papers
        return self.workspace_root / paper_name

    def find_pdf(self, paper_dir: Path) -> Path | None:
        """Find the PDF file in a paper directory."""
        if not paper_dir.exists():
            return None
        pdf_files = list(paper_dir.glob("*.pdf"))
        return pdf_files[0] if pdf_files else None

    def find_note(self, paper_dir: Path) -> Path | None:
        """Find the note file in a paper directory."""
        if not paper_dir.exists():
            return None
        # Look for note.md first, then any .md file
        note_file = paper_dir / "note.md"
        if note_file.exists():
            return note_file
        # Fallback: look for any .md file
        md_files = list(paper_dir.glob("*.md"))
        # Prefer .md file with same name as folder
        for f in md_files:
            if f.stem == paper_dir.name:
                return f
        return md_files[0] if md_files else None

    def get_paper_path(self, paper_name: str) -> Path:
        """Get the paper PDF path for a specific paper."""
        paper_dir = self.get_paper_dir(paper_name)
        pdf = self.find_pdf(paper_dir)
        if pdf:
            return pdf
        # Fallback: assume PDF has same name as folder
        return paper_dir / f"{paper_name}.pdf"

    def get_note_path(self, paper_name: str) -> Path:
        """Get the note path for a specific paper."""
        paper_dir = self.get_paper_dir(paper_name)
        note = self.find_note(paper_dir)
        if note:
            return note
        # Fallback: assume note has same name as folder
        return paper_dir / f"{paper_name}.md"

    def list_papers(self) -> list[str]:
        """List all papers in the workspace (folders containing a PDF)."""
        if not self.workspace_root.exists():
            return []
        papers = []
        for d in self.workspace_root.iterdir():
            if d.is_dir() and self.find_pdf(d):
                papers.append(d.name)
        return sorted(papers)


class LLMSettings(BaseSettings):
    """LLM provider configuration."""

    provider: str = Field(default="openai")
    model: str = Field(default="gpt-4o-mini")
    temperature: float = Field(default=0.7)
    max_tokens: int = Field(default=2000)

    # OpenAI settings
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1")

    # Grok settings
    grok_api_key: str | None = Field(default=None, alias="GROK_API_KEY")
    grok_base_url: str = Field(default="https://api.x.ai/v1")

    # Minimax settings
    minimax_api_key: str | None = Field(default=None, alias="MINIMAX_API_KEY")
    minimax_base_url: str = Field(default="https://api.minimax.io/v1")

    class Config:
        env_file = ".env"
        extra = "allow"


class PDFSettings(BaseSettings):
    """PDF processing configuration."""

    max_file_size_mb: int = Field(default=50)
    extract_images: bool = Field(default=True)
    ocr_enabled: bool = Field(default=False)
    default_highlight_color: str = Field(default="#ffff00")


class APISettings(BaseSettings):
    """API server configuration."""

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    cors_origins: list[str] = Field(default=["http://localhost:3000"])


class AppSettings(BaseSettings):
    """Main application settings."""

    app_name: str = Field(default="AI Paper Reader")
    version: str = Field(default="0.1.0")
    debug: bool = Field(default=True)

    storage: StorageSettings = Field(default_factory=StorageSettings)
    llm: LLMSettings = Field(default_factory=LLMSettings)
    api: APISettings = Field(default_factory=APISettings)
    pdf: PDFSettings = Field(default_factory=PDFSettings)

    @property
    def storage_dir(self) -> Path:
        """Get the main storage directory (workspace root)."""
        return self.storage.workspace_root

    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"
        extra = "allow"


def load_yaml_config(config_path: Path | None = None) -> dict:
    """Load configuration from YAML file."""
    if config_path is None:
        # Default to conf/app_config.yaml relative to project root
        config_path = Path(__file__).parent.parent / "conf" / "app_config.yaml"

    if not config_path.exists():
        return {}

    with open(config_path) as f:
        config = yaml.safe_load(f) or {}

    # Expand environment variables in string values
    def expand_env_vars(obj):
        if isinstance(obj, dict):
            return {k: expand_env_vars(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [expand_env_vars(item) for item in obj]
        elif isinstance(obj, str) and obj.startswith("${") and obj.endswith("}"):
            env_var = obj[2:-1]
            return os.environ.get(env_var, obj)
        return obj

    return expand_env_vars(config)


@lru_cache
def get_settings() -> AppSettings:
    """Get cached application settings."""
    yaml_config = load_yaml_config()

    # Build settings from YAML config
    app_config = yaml_config.get("app", {})
    storage_config = yaml_config.get("storage", {})
    llm_config = yaml_config.get("llm", {})
    api_config = yaml_config.get("api", {})
    pdf_config = yaml_config.get("pdf", {})

    # Override with environment variables (STORAGE__WORKSPACE_ROOT)
    if os.getenv("STORAGE__WORKSPACE_ROOT"):
        storage_config["workspace_root"] = os.getenv("STORAGE__WORKSPACE_ROOT")

    storage = StorageSettings(**storage_config)
    llm = LLMSettings(
        provider=llm_config.get("provider", "openai"),
        model=llm_config.get("model", "gpt-4o-mini"),
        temperature=llm_config.get("temperature", 0.7),
        max_tokens=llm_config.get("max_tokens", 2000),
        openai_base_url=llm_config.get("openai", {}).get("base_url", "https://api.openai.com/v1"),
        grok_base_url=llm_config.get("grok", {}).get("base_url", "https://api.x.ai/v1"),
        minimax_base_url=llm_config.get("minimax", {}).get("base_url", "https://api.minimax.io/v1"),
    )
    api = APISettings(
        host=api_config.get("host", "0.0.0.0"),
        port=api_config.get("port", 8000),
        cors_origins=api_config.get("cors_origins", ["http://localhost:3000"]),
    )
    pdf = PDFSettings(**pdf_config)

    return AppSettings(
        app_name=app_config.get("name", "AI Paper Reader"),
        version=app_config.get("version", "0.1.0"),
        debug=app_config.get("debug", True),
        storage=storage,
        llm=llm,
        api=api,
        pdf=pdf,
    )
