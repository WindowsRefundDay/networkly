"""Scheduled daily discovery for maximum volume growth.

Runs every 24 hours via cron job.
Focus: High volume, cost-efficient, automated database growth.
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Set
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sources.curated_sources import get_all_curated_urls
from src.crawlers.scrapy_spider import ScrapyRunner, get_scrapy_runner
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.agents.extractor import get_extractor
from src.api.postgres_sync import PostgresSync
from src.config import get_settings
from src.embeddings import get_embeddings
from src.db.vector_db import get_vector_db
from src.db.url_cache import get_url_cache
from src.db.models import OpportunityTiming
from src.sources.sitemap_crawler import get_sitemap_crawler


class ScheduledDiscovery:
    """Orchestrates scheduled daily discovery."""
    
    def __init__(self, db_url: str, verbose: bool = True):
        """
        Initialize scheduled discovery.
        
        Args:
            db_url: PostgreSQL database URL
            verbose: If True, print progress messages
        """
        self.db_url = db_url
        self.verbose = verbose
        self.settings = get_settings()
        
        # Initialize components
        self.url_cache = get_url_cache()
        self.scrapy_runner = get_scrapy_runner()
        self.sitemap_crawler = get_sitemap_crawler()
        self.crawler = get_hybrid_crawler()
        self.extractor = get_extractor()
        
        # Statistics
        self.stats = {
            "sitemap_urls": 0,
            "recheck_urls": 0,
            "search_urls": 0,
            "total_processed": 0,
            "successful": 0,
            "failed": 0,
            "expired_rechecked": 0,
            "annual_updated": 0,
        }
    
    def log(self, message: str):
        if self.verbose:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] {message}", flush=True)
    
    async def phase_a_sitemap_discovery(self, max_urls: int = 1500) -> Set[str]:
        """Phase A: Sitemap discovery - FAST, FREE."""
        self.log("🗺️  Phase A: Sitemap Discovery (Fast, Free)")
        
        # Load all curated domains
        all_curated = get_all_curated_urls()
        self.log(f"  Found {len(all_curated)} curated domains")
        
        # Use Scrapy to crawl all sitemaps
        # First, discover sitemap URLs for each domain
        sitemap_urls = []
        for base_url in all_curated[:50]:  # Top 50 domains
            try:
                crawler = get_sitemap_crawler()
                discovered = await crawler.discover_sitemaps(base_url)
                sitemap_urls.extend(discovered)
            except Exception as e:
                self.log(f"  Failed to discover sitemap for {base_url}: {e}")
        
        self.log(f"  Found {len(sitemap_urls)} sitemap URLs")
        
        # Use Scrapy to parse all sitemaps
        all_urls = await self.scrapy_runner.run_sitemap_spider(
            sitemap_urls=sitemap_urls,
            max_urls=max_urls
        )
        
        self.stats["sitemap_urls"] = len(all_urls)
        self.log(f"  Discovered {len(all_urls)} opportunity URLs from sitemaps")
        
        return set(all_urls)
    
    async def phase_b_recheck_queue(self, limit: int = 300) -> Set[str]:
        """Phase B: Recheck expired opportunities."""
        self.log("🔄 Phase B: Recheck Queue (Expired Opportunities)")
        
        # Get URLs due for recheck
        pending = self.url_cache.get_pending_rechecks(limit=limit)
        recheck_urls = {url for url, status in pending}
        
        self.stats["recheck_urls"] = len(recheck_urls)
        self.log(f"  Found {len(recheck_urls)} URLs due for recheck")
        
        return recheck_urls
    
    async def phase_c_limited_search(self, limit: int = 200) -> Set[str]:
        """Phase C: Limited search (cost-controlled)."""
        self.log("🔍 Phase C: Limited Search (Cost-Controlled)")
        
        # Broad queries for maximum discovery
        broad_queries = [
            "STEM competitions 2026",
            "high school internships summer",
            "scholarships for teenagers",
            "summer programs for high schoolers",
            "research opportunities for students",
            "academic competitions for teens",
            "volunteer opportunities for youth",
            "leadership programs for high school students",
            "science fair competitions 2026",
            "undergraduate research programs",
        ][:10]  # Limit to 10 queries to control cost
        
        from src.search.searxng_client import get_searxng_client
        search_client = get_searxng_client()
        all_results = []
        seen_urls = set()
        
        async def do_search(query: str):
            try:
                results = await search_client.search(query, max_results=20)
                unique_results = [
                    (r.url, r.title or "", r.snippet or "") 
                    for r in results 
                    if r.url not in seen_urls
                ]
                seen_urls.update([r.url for r in results])
                return unique_results
            except Exception as e:
                self.log(f"  Search error for '{query}': {e}")
                return []
        
        search_tasks = [do_search(q) for q in broad_queries]
        search_results = await asyncio.gather(*search_tasks)
        
        for results in search_results:
            all_results.extend(results)
        
        self.stats["search_urls"] = len(all_results)
        self.log(f"  Found {len(all_results)} URLs from search")
        
        return set([url for url, _, _ in all_results])
    
    async def phase_d_deduplication(self, urls: Set[str]) -> Set[str]:
        """Phase D: Deduplication and filtering."""
        self.log("🧹 Phase D: Deduplication & Filtering")
        
        # Filter unseen URLs (7-day window for scheduled runs)
        unseen_urls = self.url_cache.filter_unseen(list(urls), within_days=7)
        
        self.log(f"  Filtered to {len(unseen_urls)} unseen URLs (7-day window)")
        
        return unseen_urls
    
    async def phase_e_fast_crawling(self, urls: Set[str]) -> List:
        """Phase E: Fast crawling with Scrapy."""
        self.log(f"⚙️  Phase E: Fast Crawling ({len(urls)} URLs)")
        
        # Max concurrency for volume
        crawl_results = await self.crawler.crawl_batch(
            list(urls), 
            max_concurrent=120  # Very high!
        )
        
        crawl_success = sum(1 for r in crawl_results if r.success)
        crawl_failed = len(crawl_results) - crawl_success
        
        self.stats["total_processed"] += len(crawl_results)
        self.log(f"  ✅ {crawl_success} successful, ❌ {crawl_failed} failed")
        
        return crawl_results
    
    async def phase_f_gemini_extraction(self, crawl_results: List):
        """Phase F: Gemini extraction with date tracking."""
        self.log(f"🤖 Phase F: Gemini Extraction ({len([r for r in crawl_results if r.success])} pages)")
        
        sync = PostgresSync(self.db_url)
        await sync.connect()
        
        embeddings = None
        vector_db = None
        if self.settings.use_embeddings:
            try:
                embeddings = get_embeddings()
                vector_db = get_vector_db()
            except Exception as e:
                self.log(f"  Failed to initialize embeddings: {e}")
        
        extraction_semaphore = asyncio.Semaphore(15)  # Higher for batch
        
        async def extract_and_save(crawl_result) -> dict:
            if not crawl_result.success:
                self.url_cache.mark_seen(
                    crawl_result.url, 
                    "failed", 
                    expires_days=7, 
                    notes=crawl_result.error
                )
                return {"success": False, "error": crawl_result.error}
            
            content_len = len(crawl_result.markdown or '')
            if content_len < 100:
                self.url_cache.mark_seen(
                    crawl_result.url, 
                    "invalid", 
                    expires_days=30, 
                    notes="Content too short"
                )
                return {"success": False, "error": "Content too short"}
            
            async with extraction_semaphore:
                try:
                    extraction = await self.extractor.extract(
                        crawl_result.markdown, 
                        crawl_result.url
                    )
                    
                    if not extraction.success:
                        self.url_cache.mark_seen(
                            crawl_result.url, 
                            "failed", 
                            expires_days=14, 
                            notes=extraction.error
                        )
                        return {"success": False, "error": extraction.error}
                    
                    opp = extraction.opportunity_card
                    if not opp:
                        self.url_cache.mark_seen(
                            crawl_result.url, 
                            "invalid", 
                            expires_days=30, 
                            notes="No card extracted"
                        )
                        return {"success": False, "error": "No card extracted"}
                    
                    # Date validation - CRITICAL for scheduled runs
                    has_valid_dates = bool(opp.deadline or opp.start_date)
                    if not has_valid_dates:
                        opp.recheck_days = 7
                    
                    # Time-based filtering and recheck scheduling
                    if opp.is_expired:
                        if opp.timing_type == OpportunityTiming.ONE_TIME:
                            # Check 30-day grace period
                            grace_cutoff = datetime.utcnow() - timedelta(days=30)
                            if opp.deadline and opp.deadline < grace_cutoff:
                                await sync.archive_opportunity(opp.id)
                                self.url_cache.mark_seen(
                                    crawl_result.url, 
                                    "expired", 
                                    expires_days=365, 
                                    notes="Archived one-time"
                                )
                                return {"success": False, "error": "Archived one-time opportunity"}
                        
                        elif opp.timing_type in [
                            OpportunityTiming.ANNUAL,
                            OpportunityTiming.RECURRING,
                            OpportunityTiming.SEASONAL
                        ]:
                            # Set aggressive recheck for expired annual items
                            opp.recheck_days = 3
                            self.stats["expired_rechecked"] += 1
                            
                            # Check if next_cycle_expected needs update
                            if opp.next_cycle_expected:
                                days_until_next = (opp.next_cycle_expected - datetime.utcnow()).days
                                if days_until_next < 60:  # Within 2 months
                                    pass  # Keep active, might be upcoming
                                else:
                                    await sync.mark_opportunity_expired(opp.id)
                    
                    # Set recheck days based on opportunity type
                    recheck_schedule = {
                        OpportunityTiming.ROLLING: 30,
                        OpportunityTiming.ONGOING: 60,
                        OpportunityTiming.RECURRING: 21,
                        OpportunityTiming.ANNUAL: 21,
                        OpportunityTiming.SEASONAL: 30,
                        OpportunityTiming.ONE_TIME: 14,
                        OpportunityType.SCHOLARSHIP: 30,
                        OpportunityType.INTERNESHIP: 14,
                        OpportunityType.COMPETITION: 7,
                        OpportunityType.RESEARCH: 21,
                        OpportunityType.SUMMER_PROGRAM: 30,
                        OpportunityType.CAMP: 21,
                    }
                    
                    default_recheck = recheck_schedule.get(opp.timing_type, 14)
                    opp.recheck_days = min(opp.recheck_days, default_recheck)
                    
                    # Save to database
                    opp_id = await sync.upsert_opportunity(opp)
                    
                    # Track if annual item was updated
                    if opp.timing_type in [OpportunityTiming.ANNUAL, OpportunityTiming.SEASONAL]:
                        if opp.is_expired and opp.next_cycle_expected:
                            self.stats["annual_updated"] += 1
                    
                    # Mark as seen
                    self.url_cache.mark_seen(
                        crawl_result.url, 
                        "success", 
                        expires_days=opp.recheck_days, 
                        notes=opp.title
                    )
                    
                    # Add to vector DB
                    if embeddings and vector_db and self.settings.use_embeddings:
                        try:
                            emb_vector = embeddings.generate_for_indexing(opp.to_embedding_text())
                            vector_db.add_opportunity_with_embedding(opp, emb_vector)
                        except Exception:
                            pass  # Silent fail
                    
                    return {
                        "success": True,
                        "title": opp.title,
                        "type": opp.opportunity_type.value
                    }
                    
                except Exception as e:
                    self.url_cache.mark_seen(
                        crawl_result.url, 
                        "failed", 
                        expires_days=14, 
                        notes=str(e)[:100]
                    )
                    return {"success": False, "error": str(e)[:100]}
        
        expired_count = 0
        annual_updated = 0
        
        tasks = [extract_and_save(cr) for cr in crawl_results]
        results = await asyncio.gather(*tasks)
        
        successful = sum(1 for r in results if r.get("success"))
        failed = len(results) - successful
        
        self.stats["successful"] += successful
        self.stats["failed"] += failed
        
        self.log(f"  ✅ {successful} successful, ❌ {failed} failed")
        self.log(f"  📅 Rechecked {expired_count} expired opportunities")
        self.log(f"  🔄 Updated {annual_updated} annual/recurring opportunities")
        
        await sync.close()
    
    async def phase_g_archiving(self):
        """Phase G: Archiving and cleanup."""
        self.log("🗄️  Phase G: Archiving & Cleanup")
        
        sync = PostgresSync(self.db_url)
        await sync.connect()
        
        try:
            # Archive old one-time items
            archived = await sync.archive_old_opportunities(days=30)
            self.log(f"  Archived {archived} old one-time opportunities")
            
            # Clean low-confidence noise
            cleaned = await sync.cleanup_low_confidence(threshold=0.3)
            self.log(f"  Cleaned {cleaned} low-confidence opportunities")
            
        except Exception as e:
            self.log(f"  Cleanup error: {e}")
        
        await sync.close()
    
    async def run(
        self,
        max_urls_per_source: int = 100,
    ):
        """
        Run scheduled daily discovery.
        
        Args:
            max_urls_per_source: Max URLs per source
        """
        self.log("🚀 Starting scheduled discovery...")
        self.log(f"  Database: {self.db_url[:50]}...")
        
        # Initialize database connection
        sync = PostgresSync(self.db_url)
        await sync.connect()
        
        all_urls = set()
        
        # Phase A: Sitemap discovery
        urls = await self.phase_a_sitemap_discovery(max_urls=max_urls_per_source)
        all_urls.update(urls)
        
        # Phase B: Recheck queue
        urls = await self.phase_b_recheck_queue(limit=max_urls_per_source)
        all_urls.update(urls)
        
        # Phase C: Limited search
        urls = await self.phase_c_limited_search(limit=max_urls_per_source)
        all_urls.update(urls)
        
        # Phase D: Deduplication & filtering
        urls = await self.phase_d_deduplication(all_urls)
        
        # Phase E: Fast crawling
        crawl_results = await self.phase_e_fast_crawling(urls)
        
        # Phase F: Gemini extraction
        await self.phase_f_gemini_extraction(crawl_results)
        
        # Phase G: Archiving & cleanup
        await self.phase_g_archiving()
        
        # Print final statistics
        self.log("\n" + "="*60)
        self.log("📈 FINAL STATISTICS")
        self.log("="*60)
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
        self.log("\n✨ Scheduled discovery complete!")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Scheduled daily opportunity discovery")
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Max URLs per source (default: 100)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress messages",
    )
    
    args = parser.parse_args()
    
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")
    
    if not db_url:
        print("Error: DATABASE_URL not found in environment", file=sys.stderr)
        sys.exit(1)
    
    try:
        asyncio.run(ScheduledDiscovery(db_url, verbose=not args.quiet).run(max_urls_per_source=args.limit))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
