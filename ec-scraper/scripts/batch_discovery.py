"""Batch discovery script orchestrating all opportunity sources.

This script runs a comprehensive discovery process using:
1. Curated high-quality sources
2. Sitemap crawling from trusted domains (powered by Scrapy)
3. AI-powered search discovery
4. Recheck queue for expired opportunities

Note: RSS monitoring removed - replaced with enhanced Scrapy sitemap discovery.
"""

import asyncio
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import List, Set
import argparse
from dotenv import load_dotenv

# Load env first
load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sources.curated_sources import get_all_curated_urls, CURATED_SOURCES
from src.sources.sitemap_crawler import get_sitemap_crawler
from src.agents.discovery import get_discovery_agent
from src.agents.extractor import get_extractor
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.db.url_cache import get_url_cache
from src.api.postgres_sync import PostgresSync
from src.config import get_settings
from src.embeddings import get_embeddings
from src.db.vector_db import get_vector_db
from src.db.models import OpportunityTiming


class BatchDiscovery:
    """Orchestrates discovery from multiple sources."""
    
    def __init__(self, db_url: str, verbose: bool = True):
        """
        Initialize batch discovery.
        
        Args:
            db_url: PostgreSQL database URL
            verbose: If True, print progress messages
        """
        self.db_url = db_url
        self.verbose = verbose
        self.settings = get_settings()
        
        # Initialize components
        self.url_cache = get_url_cache()
        self.sitemap_crawler = get_sitemap_crawler()
        self.discovery_agent = get_discovery_agent()
        self.crawler = get_hybrid_crawler()
        self.extractor = get_extractor()
        
        # Statistics
        self.stats = {
            "curated_urls": 0,
            "sitemap_urls": 0,
            "search_urls": 0,
            "recheck_urls": 0,
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
        }
    
    def log(self, message: str):
        """Log message if verbose enabled."""
        if self.verbose:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] {message}", flush=True)
    
    async def discover_from_curated(self, limit: int = 50) -> Set[str]:
        """
        Discover URLs from curated sources.
        
        Args:
            limit: Max URLs to process
            
        Returns:
            Set of discovered URLs
        """
        self.log("📚 Discovering from curated sources...")
        
        all_urls = get_all_curated_urls()
        unseen = self.url_cache.filter_unseen(all_urls, within_days=14)
        
        self.log(f"  Found {len(all_urls)} curated URLs, {len(unseen)} new/due for recheck")
        self.stats["curated_urls"] = len(unseen)
        
        return set(unseen[:limit])
    
    async def discover_from_sitemaps(self, limit: int = 100) -> Set[str]:
        """
        Discover URLs from sitemaps of curated domains.
        
        Args:
            limit: Max URLs total
            
        Returns:
            Set of discovered URLs
        """
        self.log("🗺️  Discovering from sitemaps...")
        
        # Use curated sources as base domains
        base_urls = get_all_curated_urls()[:20]  # Top 20 curated sources
        
        urls = await self.sitemap_crawler.crawl_multiple_domains(
            base_urls,
            filter_opportunities=True,
            max_urls_per_domain=10,
        )
        
        unseen = self.url_cache.filter_unseen(urls, within_days=14)
        
        self.log(f"  Found {len(urls)} sitemap URLs, {len(unseen)} new/due for recheck")
        self.stats["sitemap_urls"] = len(unseen)
        
        return set(unseen[:limit])
    
    # RSS monitoring removed - replaced with Scrapy sitemap discovery
    # This functionality is now handled by sitemap crawler with higher performance
    
    async def discover_from_search(self, focus_areas: List[str], limit: int = 100) -> Set[str]:
        """
        Discover URLs using AI-powered search.
        
        Args:
            focus_areas: List of focus areas to search
            limit: Max URLs total
            
        Returns:
            Set of discovered URLs
        """
        self.log(f"🔍 Discovering from AI search ({len(focus_areas)} focus areas)...")
        
        all_urls = set()
        
        for focus in focus_areas:
            self.log(f"  Searching: {focus}")
            urls = await self.discovery_agent.run(
                focus_area=focus,
                max_iterations=1,  # Keep it fast
                target_url_count=50,
            )
            all_urls.update(urls)
            
            if len(all_urls) >= limit:
                break
        
        unseen = self.url_cache.filter_unseen(list(all_urls), within_days=7)
        
        self.log(f"  Found {len(all_urls)} search URLs, {len(unseen)} new/due for recheck")
        self.stats["search_urls"] = len(unseen)
        
        return set(unseen[:limit])
    
    def get_recheck_queue(self, limit: int = 50) -> Set[str]:
        """
        Get URLs from recheck queue.
        
        Args:
            limit: Max URLs to recheck
            
        Returns:
            Set of URLs needing recheck
        """
        self.log("🔄 Getting recheck queue...")
        
        pending = self.url_cache.get_pending_rechecks(limit=limit)
        urls = {url for url, status in pending}
        
        self.log(f"  Found {len(urls)} URLs due for recheck")
        self.stats["recheck_urls"] = len(urls)
        
        return urls
    
    async def process_urls(self, urls: Set[str], sync: PostgresSync) -> dict:
        """
        Process a set of URLs: crawl, extract, save.
        
        Args:
            urls: Set of URLs to process
            sync: PostgreSQL sync client
            
        Returns:
            Dictionary with processing statistics
        """
        self.log(f"⚙️  Processing {len(urls)} URLs in parallel...")
        
        # Crawl in parallel
        crawl_results = await self.crawler.crawl_batch(list(urls), max_concurrent=10)
        
        # Extract in parallel
        extraction_semaphore = asyncio.Semaphore(8)
        
        async def extract_and_save(crawl_result):
            """Extract and save a single URL."""
            if not crawl_result.success:
                self.url_cache.mark_seen(crawl_result.url, "failed", expires_days=7, notes=crawl_result.error)
                return {"success": False, "error": crawl_result.error}
            
            if len(crawl_result.markdown or '') < 100:
                self.url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Content too short")
                return {"success": False, "error": "Content too short"}
            
            async with extraction_semaphore:
                try:
                    extraction = await self.extractor.extract(crawl_result.markdown, crawl_result.url)
                    
                    if not extraction.success:
                        self.url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=extraction.error)
                        return {"success": False, "error": extraction.error}
                    
                    opp = extraction.opportunity_card
                    if not opp:
                        self.url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="No card extracted")
                        return {"success": False, "error": "No card extracted"}
                    
                    # Skip low confidence
                    confidence = extraction.confidence or 0.0
                    if confidence < 0.4:
                        self.url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30)
                        return {"success": False, "error": f"Low confidence: {confidence:.2f}"}
                    
                    # Skip generic extractions
                    if opp.title == "Unknown Opportunity":
                        self.url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30)
                        return {"success": False, "error": "Generic extraction"}
                    
                    # Skip expired one-time opportunities
                    if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                        self.url_cache.mark_seen(crawl_result.url, "expired", expires_days=365)
                        return {"success": False, "error": "Expired one-time"}
                    
                    # Save to database
                    await sync.upsert_opportunity(ec)
                    
                    # Mark as successful
                    self.url_cache.mark_seen(crawl_result.url, "success", expires_days=opp.recheck_days, notes=opp.title)
                    
                    return {"success": True, "title": opp.title, "type": opp.opportunity_type.value}
                
                except Exception as e:
                    self.url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=str(e)[:100])
                    return {"success": False, "error": str(e)[:100]}
        
        # Process all URLs
        tasks = [extract_and_save(cr) for cr in crawl_results]
        results = await asyncio.gather(*tasks)
        
        # Count successes
        successful = sum(1 for r in results if r.get("success"))
        failed = len(results) - successful
        
        self.stats["total_processed"] += len(results)
        self.stats["successful"] += successful
        self.stats["failed"] += failed
        
        self.log(f"  ✅ {successful} successful, ❌ {failed} failed")
        
        return {"successful": successful, "failed": failed}
    
    async def run(
        self,
        sources: List[str] = None,
        focus_areas: List[str] = None,
        limit_per_source: int = 50,
    ):
        """
        Run comprehensive batch discovery.
        
        Args:
            sources: List of sources to use (default: all)
            focus_areas: Focus areas for search discovery
            limit_per_source: Max URLs per source
        """
        self.log("🚀 Starting batch discovery...")
        self.log(f"  Database: {self.db_url[:50]}...")
        
        # Initialize database connection
        sync = PostgresSync(self.db_url)
        await sync.connect()
        
        all_urls = set()
        
        # Default sources and focus areas
        if sources is None:
            sources = ["curated", "sitemaps", "search", "recheck"]  # rss removed
        
        if focus_areas is None:
            focus_areas = [
                "STEM competitions",
                "internships",
                "summer programs",
                "scholarships",
            ]
        
        # Discover from each source
        if "curated" in sources:
            urls = await self.discover_from_curated(limit=limit_per_source)
            all_urls.update(urls)
        
        if "sitemaps" in sources:
            urls = await self.discover_from_sitemaps(limit=limit_per_source)
            all_urls.update(urls)
        
        # rss removed - replaced with Scrapy sitemap discovery
        
        if "search" in sources:
            urls = await self.discover_from_search(focus_areas, limit=limit_per_source)
            all_urls.update(urls)
        
        if "recheck" in sources:
            urls = self.get_recheck_queue(limit=limit_per_source)
            all_urls.update(urls)
        
        self.log(f"\n📊 Total unique URLs to process: {len(all_urls)}")
        
        # Process all URLs
        if all_urls:
            await self.process_urls(all_urls, sync)
        
        # Print final statistics
        self.log("\n" + "="*60)
        self.log("📈 FINAL STATISTICS")
        self.log("="*60)
        self.log(f"  Curated URLs discovered:  {self.stats['curated_urls']}")
        self.log(f"  Sitemap URLs discovered:  {self.stats['sitemap_urls']}")
        self.log(f"  Search URLs discovered:   {self.stats['search_urls']}")
        self.log(f"  Recheck URLs queued:      {self.stats['recheck_urls']}")
        self.log(f"  Total URLs processed:     {self.stats['total_processed']}")
        self.log(f"  ✅ Successful:             {self.stats['successful']}")
        self.log(f"  ❌ Failed:                 {self.stats['failed']}")
        self.log("="*60)
        
        # Cache statistics
        cache_stats = self.url_cache.get_stats()
        self.log(f"\n🗄️  Cache: {cache_stats['total_urls']} total URLs")
        self.log(f"  By status: {cache_stats['by_status']}")
        
        await sync.close()
        self.log("\n✨ Batch discovery complete!")


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Batch discovery of EC opportunities")
    parser.add_argument(
        "--source",
        choices=["curated", "sitemaps", "rss", "search", "recheck", "all"],
        default="all",
        help="Source to use for discovery (default: all)",
    )
    parser.add_argument(
        "--focus",
        nargs="+",
        help="Focus areas for search discovery (e.g., 'STEM competitions' 'scholarships')",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max URLs per source (default: 50)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress messages",
    )
    
    args = parser.parse_args()
    
    # Get database URL
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")
    
    if not db_url:
        print("Error: DATABASE_URL not found in environment", file=sys.stderr)
        sys.exit(1)
    
    # Parse sources
    if args.source == "all":
        sources = ["curated", "sitemaps", "rss", "search", "recheck"]
    else:
        sources = [args.source]
    
    # Run discovery
    discovery = BatchDiscovery(db_url, verbose=not args.quiet)
    await discovery.run(
        sources=sources,
        focus_areas=args.focus,
        limit_per_source=args.limit,
    )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️  Discovery interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
