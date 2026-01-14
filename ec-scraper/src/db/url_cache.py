"""URL cache for deduplication and scheduled rechecks."""

import asyncio
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from ..config import get_settings


class URLCache:
    """SQLite-based URL cache to avoid re-processing and schedule rechecks."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the URL cache.
        
        Args:
            db_path: Path to SQLite database file. If None, uses settings default.
        """
        settings = get_settings()
        if db_path is None:
            # Use separate cache database
            cache_dir = Path(settings.sqlite_path).parent
            db_path = str(cache_dir / "url_cache.db")
        
        self.db_path = db_path
        self._ensure_db()
    
    def _ensure_db(self):
        """Create database tables if they don't exist."""
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS url_cache (
                    url TEXT PRIMARY KEY,
                    domain TEXT NOT NULL,
                    status TEXT NOT NULL,
                    first_seen TIMESTAMP NOT NULL,
                    last_checked TIMESTAMP NOT NULL,
                    next_recheck TIMESTAMP,
                    check_count INTEGER DEFAULT 0,
                    success_count INTEGER DEFAULT 0,
                    notes TEXT
                )
            """)
            
            # Create indexes for performance
            conn.execute("CREATE INDEX IF NOT EXISTS idx_domain ON url_cache(domain)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON url_cache(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_next_recheck ON url_cache(next_recheck)")
            
            conn.commit()
    
    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return "unknown"
    
    def is_seen(self, url: str, within_days: Optional[int] = None) -> bool:
        """
        Check if a URL has been seen before.
        
        Args:
            url: URL to check
            within_days: If specified, only returns True if URL was checked within this many days
            
        Returns:
            True if URL exists in cache (and within specified time window)
        """
        with sqlite3.connect(self.db_path) as conn:
            if within_days is None:
                result = conn.execute(
                    "SELECT 1 FROM url_cache WHERE url = ?",
                    (url,)
                ).fetchone()
                return result is not None
            else:
                cutoff = datetime.utcnow() - timedelta(days=within_days)
                result = conn.execute(
                    "SELECT 1 FROM url_cache WHERE url = ? AND last_checked >= ?",
                    (url, cutoff)
                ).fetchone()
                return result is not None
    
    def mark_seen(
        self,
        url: str,
        status: str,
        expires_days: int = 30,
        notes: Optional[str] = None
    ):
        """
        Mark a URL as seen with a given status.
        
        Args:
            url: URL to mark
            status: Status (e.g., "success", "failed", "blocked", "invalid")
            expires_days: Days until this URL should be rechecked
            notes: Optional notes about the URL
        """
        domain = self._get_domain(url)
        now = datetime.utcnow()
        next_recheck = now + timedelta(days=expires_days)
        
        with sqlite3.connect(self.db_path) as conn:
            # Check if URL exists
            existing = conn.execute(
                "SELECT check_count, success_count FROM url_cache WHERE url = ?",
                (url,)
            ).fetchone()
            
            if existing:
                check_count, success_count = existing
                check_count += 1
                if status == "success":
                    success_count += 1
                
                conn.execute("""
                    UPDATE url_cache
                    SET status = ?,
                        last_checked = ?,
                        next_recheck = ?,
                        check_count = ?,
                        success_count = ?,
                        notes = ?
                    WHERE url = ?
                """, (status, now, next_recheck, check_count, success_count, notes, url))
            else:
                success_count = 1 if status == "success" else 0
                conn.execute("""
                    INSERT INTO url_cache
                    (url, domain, status, first_seen, last_checked, next_recheck, check_count, success_count, notes)
                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                """, (url, domain, status, now, now, next_recheck, success_count, notes))
            
            conn.commit()
    
    def get_pending_rechecks(self, limit: int = 100) -> List[Tuple[str, str]]:
        """
        Get URLs that are due for rechecking.
        
        Args:
            limit: Maximum number of URLs to return
            
        Returns:
            List of (url, status) tuples for URLs due for recheck
        """
        now = datetime.utcnow()
        
        with sqlite3.connect(self.db_path) as conn:
            results = conn.execute("""
                SELECT url, status
                FROM url_cache
                WHERE next_recheck IS NOT NULL
                  AND next_recheck <= ?
                  AND status IN ('success', 'failed')
                ORDER BY next_recheck ASC
                LIMIT ?
            """, (now, limit)).fetchall()
            
            return results
    
    def get_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        with sqlite3.connect(self.db_path) as conn:
            total = conn.execute("SELECT COUNT(*) FROM url_cache").fetchone()[0]
            
            status_counts = dict(conn.execute("""
                SELECT status, COUNT(*)
                FROM url_cache
                GROUP BY status
            """).fetchall())
            
            pending_rechecks = conn.execute("""
                SELECT COUNT(*)
                FROM url_cache
                WHERE next_recheck IS NOT NULL
                  AND next_recheck <= ?
            """, (datetime.utcnow(),)).fetchone()[0]
            
            top_domains = conn.execute("""
                SELECT domain, COUNT(*) as count
                FROM url_cache
                GROUP BY domain
                ORDER BY count DESC
                LIMIT 10
            """).fetchall()
            
            return {
                "total_urls": total,
                "by_status": status_counts,
                "pending_rechecks": pending_rechecks,
                "top_domains": [{"domain": d, "count": c} for d, c in top_domains],
            }
    
    def clear_old_entries(self, days: int = 90):
        """
        Clear old cache entries.
        
        Args:
            days: Remove entries older than this many days
        """
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        with sqlite3.connect(self.db_path) as conn:
            deleted = conn.execute("""
                DELETE FROM url_cache
                WHERE last_checked < ?
                  AND status IN ('failed', 'blocked', 'invalid')
            """, (cutoff,)).rowcount
            
            conn.commit()
            
            return deleted
    
    def filter_unseen(self, urls: List[str], within_days: Optional[int] = None) -> List[str]:
        """
        Filter a list of URLs to only include unseen ones.
        
        Args:
            urls: List of URLs to check
            within_days: If specified, only considers URLs checked within this window as "seen"
            
        Returns:
            List of URLs that haven't been seen (or not seen recently)
        """
        if not urls:
            return []
        
        unseen = []
        for url in urls:
            if not self.is_seen(url, within_days):
                unseen.append(url)
        
        return unseen


# Singleton
_cache_instance: Optional[URLCache] = None


def get_url_cache() -> URLCache:
    """Get the URL cache singleton."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = URLCache()
    return _cache_instance
