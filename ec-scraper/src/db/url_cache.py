"""URL cache for deduplication and scheduled rechecks.

Migrated from SQLite to Supabase url_cache table.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from urllib.parse import urlparse

from supabase import create_client, Client
from postgrest.exceptions import APIError

from ..config import get_settings


class URLCache:
    """Supabase-based URL cache to avoid re-processing and schedule rechecks."""
    
    def __init__(self, db_path: Optional[str] = None):
        """
        Initialize the URL cache.
        
        Args:
            db_path: Deprecated (kept for API compatibility). Uses Supabase instead.
        """
        settings = get_settings()
        
        # Get Supabase credentials
        self.supabase_url = settings.SUPABASE_URL or settings.DATABASE_URL
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY
        
        if not self.supabase_url or not self.supabase_key:
            # Fallback to env vars
            import os
            self.supabase_url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
            self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for URL cache. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )
        
        self._client: Optional[Client] = None
    
    def _get_client(self) -> Client:
        """Get or create Supabase client."""
        if self._client is None:
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client
    
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
        client = self._get_client()
        now = datetime.utcnow()
        
        query = client.table("url_cache").select("url").eq("url", url).limit(1)
        
        if within_days is not None:
            cutoff = (now - timedelta(days=within_days)).isoformat()
            query = query.gte("last_checked", cutoff)
        
        result = query.execute()
        return len(result.data) > 0 if result.data else False
    
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
        client = self._get_client()
        domain = self._get_domain(url)
        now = datetime.utcnow()
        next_recheck = (now + timedelta(days=expires_days)).isoformat()
        
        # Check if URL exists
        existing = client.table("url_cache").select("check_count, success_count").eq("url", url).limit(1).execute()
        
        check_count = 1
        success_count = 1 if status == "success" else 0
        
        if existing.data and len(existing.data) > 0:
            existing_data = existing.data[0]
            check_count = (existing_data.get("check_count") or 0) + 1
            success_count = existing_data.get("success_count") or 0
            if status == "success":
                success_count += 1
            
            # Update existing
            client.table("url_cache").update({
                "status": status,
                "last_checked": now.isoformat(),
                "next_recheck": next_recheck,
                "check_count": check_count,
                "success_count": success_count,
                "notes": notes,
            }).eq("url", url).execute()
        else:
            # Insert new
            client.table("url_cache").insert({
                "url": url,
                "domain": domain,
                "status": status,
                "first_seen": now.isoformat(),
                "last_checked": now.isoformat(),
                "next_recheck": next_recheck,
                "check_count": check_count,
                "success_count": success_count,
                "notes": notes,
            }).execute()
    
    def get_pending_rechecks(self, limit: int = 100) -> List[Tuple[str, str]]:
        """
        Get URLs that are due for rechecking.
        
        Args:
            limit: Maximum number of URLs to return
            
        Returns:
            List of (url, status) tuples for URLs due for recheck
        """
        client = self._get_client()
        now = datetime.utcnow().isoformat()
        
        result = client.table("url_cache").select("url, status").not_.is_("next_recheck", "null").lte("next_recheck", now).in_("status", ["success", "failed"]).order("next_recheck", desc=False).limit(limit).execute()
        
        if result.data:
            return [(row["url"], row["status"]) for row in result.data]
        return []
    
    def get_stats(self) -> dict:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        client = self._get_client()
        now = datetime.utcnow().isoformat()
        
        # Get total count
        total_result = client.table("url_cache").select("url", count="exact").execute()
        total = total_result.count if hasattr(total_result, 'count') else len(total_result.data) if total_result.data else 0
        
        # Get status counts (group by status)
        status_result = client.table("url_cache").select("status").execute()
        status_counts = {}
        if status_result.data:
            for row in status_result.data:
                status = row.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1
        
        # Get pending rechecks count
        pending_result = client.table("url_cache").select("url", count="exact").not_.is_("next_recheck", "null").lte("next_recheck", now).execute()
        pending_rechecks = pending_result.count if hasattr(pending_result, 'count') else len(pending_result.data) if pending_result.data else 0
        
        # Get top domains (approximate - Supabase doesn't have easy GROUP BY)
        domains_result = client.table("url_cache").select("domain").limit(1000).execute()
        domain_counts = {}
        if domains_result.data:
            for row in domains_result.data:
                domain = row.get("domain", "unknown")
                domain_counts[domain] = domain_counts.get(domain, 0) + 1
        
        top_domains = sorted(domain_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
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
        client = self._get_client()
        cutoff = (datetime.utcnow() - timedelta(days=days)).isoformat()
        
        # Delete old failed/blocked/invalid entries
        result = client.table("url_cache").delete().lt("last_checked", cutoff).in_("status", ["failed", "blocked", "invalid"]).execute()
        return len(result.data) if result.data else 0
    
    def filter_unseen(self, urls: List[str], within_days: Optional[int] = None) -> List[str]:
        """
        Filter a list of URLs to only include unseen ones.
        
        Uses batch query for efficiency (O(1) DB calls instead of O(n)).
        
        Args:
            urls: List of URLs to check
            within_days: If specified, only considers URLs checked within this window as "seen"
            
        Returns:
            List of URLs that haven't been seen (or not seen recently)
        """
        if not urls:
            return []
        
        # Use batch lookup for efficiency
        seen_urls = self.batch_check_seen(urls, within_days)
        return [url for url in urls if url not in seen_urls]
    
    def batch_check_seen(
        self,
        urls: List[str],
        within_days: Optional[int] = None
    ) -> set:
        """
        Batch check which URLs have been seen.
        
        Uses a single DB query for all URLs (efficient).
        
        Args:
            urls: List of URLs to check
            within_days: If specified, only returns URLs checked within this window
            
        Returns:
            Set of URLs that have been seen
        """
        if not urls:
            return set()
        
        client = self._get_client()
        
        # Supabase IN clause for multiple URLs
        query = client.table("url_cache").select("url").in_("url", urls)
        
        if within_days is not None:
            cutoff = (datetime.utcnow() - timedelta(days=within_days)).isoformat()
            query = query.gte("last_checked", cutoff)
        
        result = query.execute()
        if result.data:
            return {row["url"] for row in result.data}
        return set()
    
    def batch_mark_seen(
        self,
        url_statuses: List[Tuple[str, str]],
        expires_days: int = 30,
    ):
        """
        Mark multiple URLs as seen in a single transaction.
        
        Args:
            url_statuses: List of (url, status) tuples
            expires_days: Days until URLs should be rechecked
        """
        if not url_statuses:
            return
        
        client = self._get_client()
        now = datetime.utcnow()
        next_recheck = (now + timedelta(days=expires_days)).isoformat()
        
        # Prepare batch insert/update data
        records = []
        for url, status in url_statuses:
            domain = self._get_domain(url)
            records.append({
                "url": url,
                "domain": domain,
                "status": status,
                "first_seen": now.isoformat(),
                "last_checked": now.isoformat(),
                "next_recheck": next_recheck,
                "check_count": 1,
                "success_count": 1 if status == "success" else 0,
                "notes": None,
            })
        
        # Use upsert for batch insert/update
        client.table("url_cache").upsert(records, on_conflict="url").execute()

    def delete_urls(self, urls: List[str]) -> int:
        """Delete specific URLs from cache."""
        if not urls:
            return 0
        client = self._get_client()
        result = client.table("url_cache").delete().in_("url", urls).execute()
        return len(result.data) if result.data else 0


# Singleton
_cache_instance: Optional[URLCache] = None


def get_url_cache() -> URLCache:
    """Get the URL cache singleton."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = URLCache()
    return _cache_instance
