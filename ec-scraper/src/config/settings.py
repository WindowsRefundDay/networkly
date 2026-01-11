"""Configuration management for EC Scraper."""

from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # API Mode: "gemini" uses Gemini for everything, "groq" uses Groq for LLM
    api_mode: Literal["gemini", "groq"] = "gemini"

    # API Keys
    GOOGLE_API_KEY: str
    GROQ_API_KEY: Optional[str] = None

    # Gemini Model Configuration
    gemini_pro_model: str = "gemini-2.5-pro"
    gemini_flash_model: str = "gemini-2.0-flash-lite"
    
    # Groq Model Configuration (used when api_mode="groq")
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fast_model: str = "llama-3.1-8b-instant"

    # Embedding Configuration (always uses Gemini - embeddings not available on Groq)
    embedding_model: str = "gemini-embedding-001"
    embedding_dimension: int = 768  # 768 for performance, 3072 for max quality

    # Database Paths
    sqlite_db_path: str = "./data/ec_database.db"
    chroma_db_path: str = "./data/chroma"

    # Scraping Configuration
    max_concurrent_scrapes: int = 5
    scrape_timeout_seconds: int = 30

    @property
    def sqlite_path(self) -> Path:
        """Get SQLite database path as Path object."""
        path = Path(self.sqlite_db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def chroma_path(self) -> Path:
        """Get ChromaDB path as Path object."""
        path = Path(self.chroma_db_path)
        path.mkdir(parents=True, exist_ok=True)
        return path


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
