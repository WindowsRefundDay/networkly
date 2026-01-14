"""Configuration management for Opportunity Crawler."""

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

    # API Mode: "gemini" uses Google Gemini for everything (default), "groq" uses Groq for LLM
    api_mode: Literal["gemini", "groq"] = "gemini"  # Default: Google Gemini

    # API Keys (both optional - use whichever matches api_mode)
    GOOGLE_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None

    # Gemini Model Configuration
    # Main model: Used for discovery, planning, and complex reasoning tasks
    gemini_pro_model: str = "gemini-3-flash-preview"
    # Fast model: Used for extraction, matching, profiling (when use_fast_model=True)
    gemini_flash_model: str = "gemini-2.5-flash-lite"

    # Groq Model Configuration (used when api_mode="groq")
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fast_model: str = "llama-3.1-8b-instant"

    # Embedding Configuration - text-embedding-004 for vectorization (latest available)
    # Available models: text-embedding-004, gemini-embedding-001, gemini-embedding-exp
    embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 256  # 256 for speed, 768 for balance, 3072 for max quality
    use_embeddings: bool = True  # Enable embeddings for personalized curation

    # Database Paths
    sqlite_db_path: str = "./data/opportunity_database.db"
    chroma_db_path: str = "./data/chroma"

    # Scraping Configuration
    max_concurrent_scrapes: int = 5
    scrape_timeout_seconds: int = 30

    # Redis Configuration
    REDIS_URL: Optional[str] = None

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
