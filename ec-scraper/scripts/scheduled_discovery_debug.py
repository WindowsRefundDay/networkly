"""Scheduled discovery with DEBUG MODE and TIME LIMIT.

THIS IS A DEBUG VERSION - ADDS COMPREHENSIVE LOGGING + TIME CONTROL
"""

import asyncio
import sys
import os
import time
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


def log_debug(message: str, level: str = "INFO"):
    """Debug logging to stderr."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    color_codes = {
        "INFO": "\033[36m",  # Cyan
        "SUCCESS": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "DEBUG": "\033[35m",  # Magenta
        "PHASE": "\033[1;34m",  # Bold Blue
    }
    reset = "\033[0m"
    color = color_codes.get(level, "")
    print(f"{color}[{timestamp}] [{level}] {message}{reset}")
    sys.stdout.flush()


class ScheduledDiscoveryDebug:
    """Orchestrates scheduled daily discovery with DEBUG logging and TIME LIMIT."""
    
    def __init__(self, db_url: str, time_limit_seconds: int = 300):
        """
        Initialize scheduled discovery.
        
        Args:
            db_url: PostgreSQL database URL
            time_limit_seconds: Maximum time to run (default: 300 = 5 minutes)
        """
        self.db_url = db_url
        self.time_limit = time_limit_seconds
        self.start_time = time.time()
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
            "with_dates": 0,
            "without_dates": 0,
            "by_category": {},
            "by_type": {},
            "by_timing": {},
        }
        
        # Track opportunities for final review
        self.opportunities_details = []
    
    def check_time_limit(self) -> bool:
        """Check if we've exceeded time limit."""
        elapsed = time.time() - self.start_time
        remaining = self.time_limit - elapsed
        if remaining <= 0:
            log_debug(f"⏰ TIME LIMIT REACHED ({self.time_limit}s)", "WARNING")
            return False
        log_debug(f"⏱️  Time remaining: {remaining:.1f}s", "DEBUG")
        return True
    
    async def phase_a_sitemap_discovery(self, max_urls: int = 100) -> Set[str]:
        """Phase A: Sitemap discovery - FAST, FREE."""
        log_debug("=" * 80, "PHASE")
        log_debug("🗺️  PHASE A: Sitemap Discovery (Fast, Free)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return set()
        
        # Load all curated domains
        all_curated = get_all_curated_urls()
        log_debug(f"Found {len(all_curated)} curated domains", "INFO")
        
        # Use only top 10 domains for debug (5 min limit)
        domains_to_use = all_curated[:10]
        log_debug(f"Using top {len(domains_to_use)} domains for debug", "DEBUG")
        
        # Discover sitemap URLs
        sitemap_urls = []
        for base_url in domains_to_use:
            if not self.check_time_limit():
                break
            try:
                crawler = get_sitemap_crawler()
                discovered = await crawler.discover_sitemaps(base_url)
                sitemap_urls.extend(discovered)
                log_debug(f"  {base_url}: {len(discovered)} sitemaps", "DEBUG")
            except Exception as e:
                log_debug(f"  Failed to discover sitemap for {base_url}: {e}", "ERROR")
        
        log_debug(f"Found {len(sitemap_urls)} sitemap URLs total", "SUCCESS")
        
        if not sitemap_urls or not self.check_time_limit():
            return set()
        
        # Parse sitemaps with Scrapy
        log_debug(f"Parsing sitemaps (max {max_urls} URLs)...", "INFO")
        all_urls = await self.scrapy_runner.run_sitemap_spider(
            sitemap_urls=sitemap_urls,
            max_urls=max_urls
        )
        
        self.stats["sitemap_urls"] = len(all_urls)
        log_debug(f"✅ Discovered {len(all_urls)} opportunity URLs from sitemaps", "SUCCESS")
        
        return set(all_urls)
    
    async def phase_b_recheck_queue(self, limit: int = 50) -> Set[str]:
        """Phase B: Recheck expired opportunities."""
        log_debug("=" * 80, "PHASE")
        log_debug("🔄 PHASE B: Recheck Queue (Expired Opportunities)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return set()
        
        # Get URLs due for recheck
        pending = self.url_cache.get_pending_rechecks(limit=limit)
        recheck_urls = {url for url, status in pending}
        
        self.stats["recheck_urls"] = len(recheck_urls)
        log_debug(f"Found {len(recheck_urls)} URLs due for recheck", "SUCCESS")
        
        return recheck_urls
    
    async def phase_c_limited_search(self, limit: int = 50) -> Set[str]:
        """Phase C: Limited search (cost-controlled)."""
        log_debug("=" * 80, "PHASE")
        log_debug("🔍 PHASE C: Limited Search (Cost-Controlled)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return set()
        
        # Broad queries for maximum discovery (limited for debug)
        broad_queries = [
            "STEM competitions 2026",
            "high school internships summer",
            "scholarships for teenagers",
            "summer programs for high schoolers",
            "research opportunities for students",
        ][:3]  # Only 3 queries for debug
        
        log_debug(f"Using {len(broad_queries)} search queries", "INFO")
        
        from src.search.searxng_client import get_searxng_client
        search_client = get_searxng_client()
        all_results = []
        seen_urls = set()
        
        async def do_search(query: str):
            try:
                results = await search_client.search(query, max_results=10)  # Reduced for debug
                unique_results = [
                    (r.url, r.title or "", r.snippet or "") 
                    for r in results 
                    if r.url not in seen_urls
                ]
                seen_urls.update([r.url for r in results])
                log_debug(f"  '{query}': {len(unique_results)} URLs", "DEBUG")
                return unique_results
            except Exception as e:
                log_debug(f"  Search error for '{query}': {e}", "ERROR")
                return []
        
        search_tasks = [do_search(q) for q in broad_queries]
        search_results = await asyncio.gather(*search_tasks)
        
        for results in search_results:
            all_results.extend(results)
        
        self.stats["search_urls"] = len(all_results)
        log_debug(f"✅ Found {len(all_results)} URLs from search", "SUCCESS")
        
        return set([url for url, _, _ in all_results])
    
    async def phase_d_deduplication(self, urls: Set[str]) -> Set[str]:
        """Phase D: Deduplication and filtering."""
        log_debug("=" * 80, "PHASE")
        log_debug("🧹 PHASE D: Deduplication & Filtering", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return set()
        
        log_debug(f"Input URLs: {len(urls)}", "INFO")
        
        # Filter unseen URLs (7-day window)
        unseen_urls = self.url_cache.filter_unseen(list(urls), within_days=7)
        
        log_debug(f"✅ Filtered to {len(unseen_urls)} unseen URLs (7-day window)", "SUCCESS")
        
        return unseen_urls
    
    async def phase_e_fast_crawling(self, urls: Set[str]) -> List:
        """Phase E: Fast crawling with Scrapy."""
        log_debug("=" * 80, "PHASE")
        log_debug(f"⚙️  PHASE E: Fast Crawling ({len(urls)} URLs)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return []
        
        log_debug("Starting hybrid crawler (max_concurrent=75)...", "INFO")
        
        # Max concurrency for volume
        crawl_results = await self.crawler.crawl_batch(
            list(urls), 
            max_concurrent=75
        )
        
        crawl_success = sum(1 for r in crawl_results if r.success)
        crawl_failed = len(crawl_results) - crawl_success
        
        # Count crawler usage
        scrapy_count = sum(1 for r in crawl_results if r.success and r.crawler_used == "scrapy")
        crawl4ai_count = sum(1 for r in crawl_results if r.success and r.crawler_used == "crawl4ai")
        
        self.stats["total_processed"] += len(crawl_results)
        log_debug(f"✅ Crawling complete: {crawl_success} success, {crawl_failed} failed", "SUCCESS")
        log_debug(f"   Scrapy: {scrapy_count}, Crawl4AI: {crawl4ai_count}", "DEBUG")
        
        return crawl_results
    
    async def phase_f_gemini_extraction(self, crawl_results: List):
        """Phase F: Gemini extraction with date tracking."""
        log_debug("=" * 80, "PHASE")
        log_debug(f"🤖 PHASE F: Gemini Extraction ({len([r for r in crawl_results if r.success])} pages)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        if not self.check_time_limit():
            return
        
        sync = PostgresSync(self.db_url)
        await sync.connect()
        
        embeddings = None
        vector_db = None
        if self.settings.use_embeddings:
            try:
                embeddings = get_embeddings()
                vector_db = get_vector_db()
            except Exception as e:
                log_debug(f"Failed to initialize embeddings: {e}", "WARNING")
        
        extraction_semaphore = asyncio.Semaphore(15)
        
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
                    
                    # DEBUG: Log extracted opportunity
                    log_debug("─" * 60, "DEBUG")
                    log_debug(f"EXTRACTED: {opp.title[:50]}", "SUCCESS")
                    log_debug(f"  Org: {opp.organization}", "DEBUG")
                    log_debug(f"  Type: {opp.opportunity_type.value} | Timing: {opp.timing_type.value}", "DEBUG")
                    log_debug(f"  Deadline: {opp.deadline.strftime('%Y-%m-%d') if opp.deadline else 'None'}", "DEBUG")
                    log_debug(f"  Start: {opp.start_date.strftime('%Y-%m-%d') if opp.start_date else 'None'}", "DEBUG")
                    log_debug(f"  End: {opp.end_date.strftime('%Y-%m-%d') if opp.end_date else 'None'}", "DEBUG")
                    log_debug(f"  Expired: {opp.is_expired} | Next Cycle: {opp.next_cycle_expected.strftime('%Y-%m-%d') if opp.next_cycle_expected else 'None'}", "DEBUG")
                    log_debug(f"  Location: {opp.location_type.value} - {opp.location or 'N/A'}", "DEBUG")
                    log_debug(f"  Grades: {opp.grade_levels}", "DEBUG")
                    log_debug(f"  Confidence: {extraction.confidence:.2f}", "DEBUG")
                    
                    # Date validation
                    has_valid_dates = bool(opp.deadline or opp.start_date)
                    if not has_valid_dates:
                        log_debug(f"  ⚠️  NO DATES DETECTED", "WARNING")
                        opp.recheck_days = 7
                        self.stats["without_dates"] += 1
                    else:
                        self.stats["with_dates"] += 1
                    
                    # Time-based filtering
                    if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                        grace_cutoff = datetime.utcnow() - timedelta(days=30)
                        if opp.deadline and opp.deadline < grace_cutoff:
                            log_debug(f"  ❌ EXPIRED (beyond grace period)", "WARNING")
                            self.url_cache.mark_seen(
                                crawl_result.url, 
                                "expired", 
                                expires_days=365, 
                                notes="Archived one-time"
                            )
                            return {"success": False, "error": "Archived one-time opportunity"}
                    
                    elif opp.is_expired and opp.timing_type in [
                        OpportunityTiming.ANNUAL,
                        OpportunityTiming.RECURRING,
                        OpportunityTiming.SEASONAL
                    ]:
                        opp.recheck_days = 3
                        self.stats["expired_rechecked"] += 1
                        log_debug(f"  🔄 Expired {opp.timing_type.value}, recheck in 3 days", "INFO")
                    
                    # Save to database
                    opp_id = await sync.upsert_opportunity(opp)
                    
                    # Track stats
                    cat = opp.category.value
                    typ = opp.opportunity_type.value
                    timing = opp.timing_type.value
                    
                    self.stats["by_category"][cat] = self.stats["by_category"].get(cat, 0) + 1
                    self.stats["by_type"][typ] = self.stats["by_type"].get(typ, 0) + 1
                    self.stats["by_timing"][timing] = self.stats["by_timing"].get(timing, 0) + 1
                    
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
                    
                    # Store details for review
                    self.opportunities_details.append({
                        "title": opp.title,
                        "organization": opp.organization,
                        "type": typ,
                        "category": cat,
                        "timing": timing,
                        "deadline": opp.deadline.strftime("%Y-%m-%d") if opp.deadline else None,
                        "is_expired": opp.is_expired,
                        "has_dates": has_valid_dates,
                        "confidence": extraction.confidence,
                        "url": opp.url,
                    })
                    
                    # Add to vector DB
                    if embeddings and vector_db and self.settings.use_embeddings:
                        try:
                            emb_vector = embeddings.generate_for_indexing(opp.to_embedding_text())
                            vector_db.add_opportunity_with_embedding(opp, emb_vector)
                        except Exception:
                            pass
                    
                    log_debug(f"  ✅ Saved (ID: {opp_id})", "SUCCESS")
                    
                    return {
                        "success": True,
                        "title": opp.title,
                        "type": opp.opportunity_type.value
                    }
                    
                except Exception as e:
                    log_debug(f"Extraction error: {str(e)[:100]}", "ERROR")
                    self.url_cache.mark_seen(
                        crawl_result.url, 
                        "failed", 
                        expires_days=14, 
                        notes=str(e)[:100]
                    )
                    return {"success": False, "error": str(e)[:100]}
        
        log_debug("Running parallel extractions...", "INFO")
        tasks = [extract_and_save(cr) for cr in crawl_results]
        results = await asyncio.gather(*tasks)
        
        successful = sum(1 for r in results if r.get("success"))
        failed = len(results) - successful
        
        self.stats["successful"] += successful
        self.stats["failed"] += failed
        
        log_debug(f"✅ Extraction complete: {successful} successful, {failed} failed", "SUCCESS")
        
        await sync.close()
    
    async def run(self, max_urls_per_source: int = 50):
        """
        Run scheduled discovery with time limit.
        
        Args:
            max_urls_per_source: Max URLs per source (reduced for debug)
        """
        log_debug("=" * 80, "PHASE")
        log_debug("🚀 SCHEDULED DISCOVERY - DEBUG MODE", "PHASE")
        log_debug(f"⏱️  TIME LIMIT: {self.time_limit} seconds ({self.time_limit/60:.1f} minutes)", "PHASE")
        log_debug("=" * 80, "PHASE")
        
        all_urls = set()
        
        # Phase A: Sitemap discovery
        if self.check_time_limit():
            urls = await self.phase_a_sitemap_discovery(max_urls=max_urls_per_source)
            all_urls.update(urls)
        
        # Phase B: Recheck queue
        if self.check_time_limit():
            urls = await self.phase_b_recheck_queue(limit=max_urls_per_source // 2)
            all_urls.update(urls)
        
        # Phase C: Limited search
        if self.check_time_limit():
            urls = await self.phase_c_limited_search(limit=max_urls_per_source // 2)
            all_urls.update(urls)
        
        # Phase D: Deduplication
        if self.check_time_limit():
            urls = await self.phase_d_deduplication(all_urls)
        else:
            urls = set()
        
        # Phase E: Fast crawling
        if self.check_time_limit() and urls:
            crawl_results = await self.phase_e_fast_crawling(urls)
        else:
            crawl_results = []
        
        # Phase F: Gemini extraction
        if self.check_time_limit() and crawl_results:
            await self.phase_f_gemini_extraction(crawl_results)
        
        # Print final statistics
        total_time = time.time() - self.start_time
        
        log_debug("=" * 80, "PHASE")
        log_debug("📈 FINAL STATISTICS", "PHASE")
        log_debug("=" * 80, "PHASE")
        log_debug(f"⏱️  Total Runtime: {total_time:.1f}s ({total_time/60:.1f} min)", "INFO")
        log_debug(f"Sitemap URLs discovered:  {self.stats['sitemap_urls']}", "INFO")
        log_debug(f"Search URLs discovered:   {self.stats['search_urls']}", "INFO")
        log_debug(f"Recheck URLs queued:      {self.stats['recheck_urls']}", "INFO")
        log_debug(f"Total URLs processed:     {self.stats['total_processed']}", "INFO")
        log_debug(f"✅ Successful:             {self.stats['successful']}", "SUCCESS")
        log_debug(f"❌ Failed:                 {self.stats['failed']}", "ERROR" if self.stats['failed'] > 0 else "INFO")
        log_debug("=" * 80, "PHASE")
        
        # Quality metrics
        total_opps = self.stats["successful"]
        if total_opps > 0:
            with_dates_pct = self.stats["with_dates"] / total_opps * 100
            without_dates_pct = self.stats["without_dates"] / total_opps * 100
            
            log_debug("📊 QUALITY METRICS", "PHASE")
            log_debug(f"With Dates: {self.stats['with_dates']} ({with_dates_pct:.1f}%)", "SUCCESS" if with_dates_pct >= 70 else "WARNING")
            log_debug(f"Without Dates: {self.stats['without_dates']} ({without_dates_pct:.1f}%)", "WARNING" if without_dates_pct >= 30 else "INFO")
            log_debug(f"Expired Rechecked: {self.stats['expired_rechecked']}", "INFO")
            log_debug(f"Annual Updated: {self.stats['annual_updated']}", "INFO")
            log_debug("=" * 80, "PHASE")
            
            log_debug("🏷️  BY CATEGORY", "PHASE")
            for cat, count in sorted(self.stats["by_category"].items(), key=lambda x: x[1], reverse=True):
                log_debug(f"  {cat}: {count}", "INFO")
            
            log_debug("\n🎯 BY TYPE", "PHASE")
            for typ, count in sorted(self.stats["by_type"].items(), key=lambda x: x[1], reverse=True):
                log_debug(f"  {typ}: {count}", "INFO")
            
            log_debug("\n⏰ BY TIMING", "PHASE")
            for timing, count in sorted(self.stats["by_timing"].items(), key=lambda x: x[1], reverse=True):
                log_debug(f"  {timing}: {count}", "INFO")
            
            log_debug("\n" + "=" * 80, "PHASE")
            log_debug("📋 SAMPLE OPPORTUNITIES", "PHASE")
            log_debug("=" * 80, "PHASE")
            for i, opp in enumerate(self.opportunities_details[:10], 1):
                log_debug(f"{i}. {opp['title'][:60]}", "INFO")
                log_debug(f"   Type: {opp['type']} | Timing: {opp['timing']} | Deadline: {opp['deadline'] or 'N/A'}", "DEBUG")
                log_debug(f"   Conf: {opp['confidence']:.2f} | Dates: {'✓' if opp['has_dates'] else '✗'} | Expired: {opp['is_expired']}", "DEBUG")
        
        log_debug("=" * 80, "PHASE")
        log_debug("✨ Scheduled discovery complete!", "SUCCESS")
        log_debug("=" * 80, "PHASE")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Scheduled discovery (DEBUG MODE with TIME LIMIT)")
    parser.add_argument(
        "--limit",
        type=int,
        default=50,
        help="Max URLs per source (default: 50 for debug)",
    )
    parser.add_argument(
        "--time-limit",
        type=int,
        default=300,
        help="Time limit in seconds (default: 300 = 5 minutes)",
    )
    
    args = parser.parse_args()
    
    db_url = os.getenv("DATABASE_URL", "")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")
    
    if not db_url:
        log_debug("DATABASE_URL not found in environment", "ERROR")
        sys.exit(1)
    
    try:
        asyncio.run(ScheduledDiscoveryDebug(
            db_url, 
            time_limit_seconds=args.time_limit
        ).run(max_urls_per_source=args.limit))
    except Exception as e:
        log_debug(f"Fatal error: {e}", "ERROR")
        import traceback
        traceback.print_exc()
        sys.exit(1)
