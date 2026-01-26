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
    semantic_threshold=0.62,  # Balanced quality threshold (was too strict at 0.65)
    max_crawl_urls=20,  # Reduced from 35 for speed
    max_concurrent_crawls=8,  # Reduced from 10 to prevent overwhelming
    max_concurrent_extractions=4,  # Reduced from 6 to avoid Vertex AI rate limits (4×30 RPM = 120 RPM max)
    search_timeout=15.0,  # Reduced from 20s
    crawl_timeout=15.0,  # Increased back to 15s for better content extraction
    max_queries=8,  # Reduced from 10 for speed
    description="On-demand quick search optimized for speed and quality",
)

DAILY_PROFILE = DiscoveryProfile(
    name="daily",
    semantic_threshold=0.50,  # Broader - more results for daily indexing
    max_crawl_urls=100,
    max_concurrent_crawls=20,
    max_concurrent_extractions=12,  # Higher concurrency for batch processing
    search_timeout=30.0,
    crawl_timeout=20.0,
    max_queries=20,
    description="Daily batch discovery with broader coverage",
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
    gemini_pro_model: str = "gemini-2.5-pro-002"
    # Fast model: Used for extraction, matching, profiling (when use_fast_model=True)
    # Falls back to gemini_pro_model if unavailable
    gemini_flash_model: str = "gemini-2.5-flash-002"

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

    # Semantic Filter Configuration (aggressive quality filtering)
    default_semantic_threshold: float = 0.60  # Increased from 0.55 for higher quality
    semantic_category_bumps: dict = {
        "competitions": 0.01,  # Reduced from 0.02
        "internships": 0.01,  # Reduced from 0.02
        "summer_programs": 0.02,  # Reduced from 0.03
        "scholarships": 0.03,  # Reduced from 0.04
        "research": 0.01,  # Reduced from 0.02
        "volunteering": 0.01,  # Reduced from 0.02
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
