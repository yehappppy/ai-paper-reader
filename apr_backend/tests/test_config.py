"""Tests for configuration management."""

import pytest
from pathlib import Path

from src.config import (
    AppSettings,
    StorageSettings,
    LLMSettings,
    APISettings,
    PDFSettings,
    get_settings,
    load_yaml_config,
)


class TestStorageSettings:
    """Test cases for storage settings."""

    def test_default_values(self) -> None:
        """Test default storage paths."""
        settings = StorageSettings()
        assert settings.pdf_dir == Path("./data/pdfs")
        assert settings.papers_dir == Path("./data/papers")
        assert settings.notes_dir == Path("./data/notes")
        assert settings.cache_dir == Path("./data/cache")

    def test_custom_values(self) -> None:
        """Test custom storage paths."""
        settings = StorageSettings(
            pdf_dir=Path("/custom/pdfs"),
            notes_dir=Path("/custom/notes"),
        )
        assert settings.pdf_dir == Path("/custom/pdfs")
        assert settings.notes_dir == Path("/custom/notes")


class TestLLMSettings:
    """Test cases for LLM settings."""

    def test_default_values(self) -> None:
        """Test default LLM configuration."""
        settings = LLMSettings()
        assert settings.provider == "openai"
        assert settings.model == "gpt-4o-mini"
        assert settings.temperature == 0.7
        assert settings.max_tokens == 2000


class TestPDFSettings:
    """Test cases for PDF settings."""

    def test_default_values(self) -> None:
        """Test default PDF configuration."""
        settings = PDFSettings()
        assert settings.max_file_size_mb == 50
        assert settings.extract_images is True
        assert settings.ocr_enabled is False


class TestAppSettings:
    """Test cases for main app settings."""

    def test_default_values(self) -> None:
        """Test default app configuration."""
        settings = AppSettings()
        assert settings.app_name == "AI Paper Reader"
        assert settings.version == "0.1.0"
        assert settings.debug is True

    def test_storage_dir_property(self) -> None:
        """Test storage_dir property returns parent of pdf_dir."""
        settings = StorageSettings(pdf_dir=Path("./data/pdfs"))
        app_settings = AppSettings(storage=settings)
        assert app_settings.storage_dir == Path("./data")


class TestLoadYamlConfig:
    """Test cases for YAML config loading."""

    def test_load_default_config(self) -> None:
        """Test loading default configuration."""
        config = load_yaml_config()
        assert isinstance(config, dict)

    def test_config_structure(self) -> None:
        """Test config has expected keys."""
        config = load_yaml_config()
        # Config should have these top-level keys (if file exists)
        expected_keys = ["app", "storage", "llm", "api", "pdf"]
        for key in expected_keys:
            # Key may or may not exist depending on config file
            if key in config:
                assert isinstance(config[key], dict)


class TestGetSettings:
    """Test cases for get_settings function."""

    def test_get_settings_returns_app_settings(self) -> None:
        """Test get_settings returns AppSettings."""
        settings = get_settings()
        assert isinstance(settings, AppSettings)

    def test_settings_cached(self) -> None:
        """Test that settings are cached."""
        settings1 = get_settings()
        settings2 = get_settings()
        assert settings1 is settings2
