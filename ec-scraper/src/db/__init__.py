"""Database module."""

from .models import OpportunityCard, OpportunityCategory, OpportunityType, ExtractionResult, LocationType, PendingURL

__all__ = [
    "OpportunityCard",
    "OpportunityCategory", 
    "OpportunityType",
    "LocationType",
    "PendingURL",
    "ExtractionResult",
]

# Import these lazily to avoid settings initialization at module load time
# from .sqlite_db import SQLiteDB, get_sqlite_db
# from .vector_db import VectorDB, get_vector_db
# from .url_cache import URLCache, get_url_cache


