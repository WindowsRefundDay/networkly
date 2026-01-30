"""Configuration management for Opportunity Crawler."""

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Literal, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


@dataclass
class DiscoveryProfile:
    """Configuration profile for discovery runs."""
    
    name: str
    # Semantic filter threshold (higher = stricter relevance)
    semantic_threshold: float
    # Max URLs to crawl per run
    max_crawl_urls: int
    # Max concurrent crawls
    max_concurrent_crawls: int
    # Max concurrent AI extractions
    max_concurrent_extractions: int
    # Search timeout in seconds
    search_timeout: float
    # Crawl timeout per URL in seconds
    crawl_timeout: float
    # Max queries to generate
    max_queries: int
    # Description for logging
    description: str


# Discovery profiles: quick (on-demand) vs daily (batch)
QUICK_PROFILE = DiscoveryProfile(
    name="quick",
    semantic_threshold=0.48,
    max_crawl_urls=50,
    max_concurrent_crawls=12,
    max_concurrent_extractions=6,
    search_timeout=20.0,
    crawl_timeout=20.0,
    max_queries=15,
    description="On-demand quick search optimized for MAXIMUM opportunity discovery",
)

DAILY_PROFILE = DiscoveryProfile(
    name="daily",
    semantic_threshold=0.42,
    max_crawl_urls=150,
    max_concurrent_crawls=25,
    max_concurrent_extractions=15,
    search_timeout=30.0,
    crawl_timeout=25.0,
    max_queries=30,
    description="Daily batch discovery with MAXIMUM coverage",
)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Vertex AI Configuration (IAM auth - preferred for production)
    use_vertex_ai: bool = True  # Use Vertex AI Gemini API instead of Developer API
    vertex_project_id: Optional[str] = None  # GCP project ID (required if use_vertex_ai=True)
    vertex_location: str = "us-central1"  # Vertex AI location

    # API Key (only used when use_vertex_ai=False)
    GOOGLE_API_KEY: Optional[str] = None

    # Gemini Model Configuration
    # Main model: Used for discovery, planning, and complex reasoning tasks
    gemini_pro_model: str = "gemini-2.5-pro"
    # Fast model: Used for extraction, matching, profiling (when use_fast_model=True)
    # Falls back to gemini_pro_model if unavailable
    gemini_flash_model: str = "gemini-2.5-flash"

    # Embedding Configuration - text-embedding-004 for vectorization
    # Available models: text-embedding-004 (stable), gemini-embedding-001
    embedding_model: str = "text-embedding-004"
    embedding_dimension: int = 256  # 256 for speed, 768 for balance, 3072 for max quality
    use_embeddings: bool = True  # Enable embeddings for personalized curation

    # Database Paths
    sqlite_db_path: str = "./data/opportunity_database.db"
    chroma_db_path: str = "./data/chroma"

    # Scraping Configuration (defaults, can be overridden by profile)
    max_concurrent_scrapes: int = 5
    scrape_timeout_seconds: int = 30

    # Centralized Timeout Configuration (aggressive optimization)
    search_timeout_seconds: float = 20.0  # Reduced from 30.0
    crawl_timeout_seconds: float = 15.0  # Reduced from 20.0
    embedding_timeout_seconds: float = 20.0  # Reduced from 30.0
    llm_timeout_seconds: float = 45.0  # Reduced from 60.0

    # Centralized Retry Configuration (aggressive - fail fast)
    max_retries: int = 2  # Reduced from 3
    retry_base_delay: float = 0.5  # Reduced from 1.0
    retry_max_delay: float = 10.0  # Reduced from 30.0

    # Semantic Filter Configuration
    default_semantic_threshold: float = 0.48
    semantic_category_bumps: dict = {
        "competitions": 0.0,
        "internships": 0.0,
        "summer_programs": 0.01,
        "scholarships": 0.01,
        "research": 0.0,
        "volunteering": 0.0,
        "general": 0.0,
    }

    # Redis Configuration
    REDIS_URL: Optional[str] = None

    # Supabase Configuration (for direct database writes)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None
    # Legacy DATABASE_URL support (for backward compatibility)
    DATABASE_URL: Optional[str] = None

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


def get_discovery_profile(profile_name: str = "quick") -> DiscoveryProfile:
    """
    Get a discovery profile by name.
    
    Args:
        profile_name: 'quick' for on-demand, 'daily' for batch
        
    Returns:
        DiscoveryProfile configuration
    """
    profiles = {
        "quick": QUICK_PROFILE,
        "daily": DAILY_PROFILE,
    }
    return profiles.get(profile_name, QUICK_PROFILE)
