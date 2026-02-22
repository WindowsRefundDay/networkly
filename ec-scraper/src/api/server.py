"""FastAPI server for EC Scraper discovery API.

Provides secured HTTP endpoints for quick and daily discovery,
intended for deployment as a standalone containerized service.
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import json

# Add parent paths for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.config import get_settings, get_discovery_profile
from src.api.postgres_sync import PostgresSync
from src.search.searxng_client import get_searxng_client
from src.search.duckduckgo_client import get_duckduckgo_client
from src.search.semantic_filter import get_semantic_filter
from src.agents.extractor import get_extractor
from src.agents.query_generator import get_query_generator
from src.agents.discovery import get_discovery_agent
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.db.url_cache import get_url_cache
from src.agents.summarizer import get_summarizer
from src.db.models import SummarizeRequest, SummarizeResponse


# Query category hints for adaptive semantic thresholds
CATEGORY_HINTS = {
    "competitions": ["competition", "olympiad", "contest", "challenge"],
    "internships": ["internship", "intern", "externship", "work experience"],
    "summer_programs": ["summer program", "camp", "workshop", "course"],
    "scholarships": ["scholarship", "grant", "award", "financial aid"],
    "research": ["research", "lab", "mentorship"],
    "volunteering": ["volunteer", "community service", "nonprofit", "ngo"],
}


def detect_query_category(queries: List[str], fallback: str) -> str:
    counts = {category: 0 for category in CATEGORY_HINTS.keys()}
    combined = " ".join(queries + [fallback]).lower()
    for category, hints in CATEGORY_HINTS.items():
        if any(hint in combined for hint in hints):
            counts[category] += 1
    top_category = max(counts.items(), key=lambda item: item[1])
    if top_category[1] == 0:
        return "general"
    return top_category[0]


# FastAPI app
app = FastAPI(
    title="EC Scraper Discovery API",
    description="API for discovering extracurricular opportunities",
    version="1.0.0",
)

# Security
security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Verify the API token from Authorization header."""
    expected_token = os.getenv("DISCOVERY_API_TOKEN")
    
    if not expected_token:
        raise HTTPException(
            status_code=500,
            detail="DISCOVERY_API_TOKEN not configured on server"
        )
    
    if credentials.credentials != expected_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing API token"
        )
    
    return credentials.credentials


# Request/Response models
class QuickDiscoveryRequest(BaseModel):
    query: str
    userProfileId: Optional[str] = None
    profile: str = "quick"  # 'quick' or 'daily'


class DailyDiscoveryRequest(BaseModel):
    focusAreas: Optional[List[str]] = None
    limit: int = 100
    sources: Optional[List[str]] = None


class DiscoveryResult(BaseModel):
    success: bool
    message: str
    opportunitiesFound: int = 0
    duration: float = 0.0
    timestamp: str


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    version: str = "1.0.0"
    search_backends: Optional[Dict[str, str]] = None


# ── Startup validation ────────────────────────────────────────────
@app.on_event("startup")
async def validate_search_backends():
    """Log search backend availability at startup."""
    from src.search.duckduckgo_client import _DDGS_AVAILABLE
    backends = {
        "ddgs_library": "available" if _DDGS_AVAILABLE else "MISSING — using httpx fallback",
        "httpx_fallback": "available",
    }
    # Check SearXNG
    settings = get_settings()
    searxng_url = getattr(settings, 'searxng_url', 'http://localhost:8080')
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=3)) as session:
            async with session.get(f"{searxng_url}/search", params={"q": "test", "format": "json"}) as resp:
                backends["searxng"] = "available" if resp.status == 200 else f"error (status {resp.status})"
    except Exception:
        backends["searxng"] = "unreachable"

    for name, status in backends.items():
        marker = "OK" if "available" in status else "WARN"
        sys.stderr.write(f"[Startup] Search backend {name}: [{marker}] {status}\n")

    if not _DDGS_AVAILABLE and backends["searxng"] == "unreachable":
        sys.stderr.write(
            "[Startup] WARNING: ddgs library missing AND SearXNG unreachable.\n"
            "[Startup] Discovery will use httpx HTML fallback (may be rate-limited).\n"
            "[Startup] Install ddgs: pip install ddgs\n"
        )
    app.state.search_backends = backends


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint (no auth required)."""
    backends = getattr(app.state, 'search_backends', None)
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
        search_backends=backends,
    )


@app.post("/discover/quick", response_model=DiscoveryResult)
async def quick_discovery(
    request: QuickDiscoveryRequest,
    token: str = Depends(verify_token),
):
    """
    Run quick on-demand discovery for a query.
    
    This performs:
    1. AI query generation
    2. Web search
    3. Semantic filtering
    4. Parallel crawling
    5. AI extraction
    6. Database sync
    """
    start_time = datetime.utcnow()
    
    if not request.query or len(request.query) < 3:
        raise HTTPException(
            status_code=400,
            detail="Query must be at least 3 characters"
        )
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL not configured"
        )
    
    try:
        # Run the quick discovery flow
        result = await run_quick_discovery(
            query=request.query,
            user_profile_id=request.userProfileId,
            profile=request.profile,
            db_url=db_url,
        )
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        return DiscoveryResult(
            success=True,
            message=f"Found {result['count']} opportunities",
            opportunitiesFound=result['count'],
            duration=duration,
            timestamp=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        return DiscoveryResult(
            success=False,
            message=f"Discovery failed: {str(e)[:200]}",
            opportunitiesFound=0,
            duration=duration,
            timestamp=datetime.utcnow().isoformat(),
        )


@app.post("/discover/daily", response_model=DiscoveryResult)
async def daily_discovery(
    request: DailyDiscoveryRequest,
    token: str = Depends(verify_token),
):
    """
    Run daily batch discovery across multiple sources.
    
    This performs comprehensive discovery using:
    - Curated sources
    - Sitemaps
    - AI search
    - Recheck queue
    """
    start_time = datetime.utcnow()
    
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL not configured"
        )
    
    try:
        result = await run_batch_discovery(
            focus_areas=request.focusAreas,
            limit=request.limit,
            sources=request.sources,
            db_url=db_url,
        )
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        
        return DiscoveryResult(
            success=True,
            message=f"Batch discovery complete. Found {result['successful']} opportunities.",
            opportunitiesFound=result['successful'],
            duration=duration,
            timestamp=datetime.utcnow().isoformat(),
        )
        
    except Exception as e:
        duration = (datetime.utcnow() - start_time).total_seconds()
        return DiscoveryResult(
            success=False,
            message=f"Batch discovery failed: {str(e)[:200]}",
            opportunitiesFound=0,
            duration=duration,
            timestamp=datetime.utcnow().isoformat(),
        )


# Discovery logic (extracted from scripts)
async def run_quick_discovery(
    query: str,
    user_profile_id: Optional[str],
    profile: str,
    db_url: str,
) -> Dict[str, Any]:
    """
    Run quick discovery flow.
    
    Simplified version of scripts/quick_discovery.py main() function.
    """
    from src.embeddings import get_embeddings
    from src.db.vector_db import get_vector_db
    from src.db.models import OpportunityTiming
    
    discovery_profile = get_discovery_profile(profile)
    settings = get_settings()
    
    # Initialize components
    search_client = get_searxng_client()
    query_generator = get_query_generator()
    crawler = get_hybrid_crawler()
    extractor = get_extractor()
    url_cache = get_url_cache()
    sync = PostgresSync(db_url)
    await sync.connect()
    
    # Track results
    database_matches = []
    
    try:
        # Phase 0: Database Search
        try:
            # Direct query for existing matches
            from supabase import create_client
            client = sync._get_client()
            search_pattern = f"%{query}%"
            existing = client.table("opportunities").select("*").or_(
                f"title.ilike.{search_pattern},company.ilike.{search_pattern}"
            ).limit(10).execute()
            
            if existing.data:
                database_matches = existing.data
                # If we found enough matches (e.g. > 5), maybe we can return early?
                # For now, let's just track them.
        except Exception as e:
            sys.stderr.write(f"[Quick] Database search error: {e}\n")

        # Generate search queries
        try:
            search_queries = await query_generator.generate_queries(
                query, 
                count=discovery_profile.max_queries
            )
        except Exception:
            # Fallback to template-based queries
            current_year = datetime.now().year
            search_queries = [
                f"high school {query} summer program {current_year}",
                f"{query} internship for high school students",
                f"{query} research opportunities for high schoolers",
                f"{query} competitions high school {current_year}",
                f"{query} volunteer work for teens",
            ]
        
        # Search phase
        all_results = []
        seen_urls = set()
        
        for search_query in search_queries:
            try:
                results = await search_client.search(search_query, max_results=10)
                for result in results:
                    if result.url not in seen_urls:
                        seen_urls.add(result.url)
                        all_results.append((result.url, result.title or "", result.snippet or ""))
            except Exception:
                continue
        
        # Semantic filtering
        semantic_filter = get_semantic_filter()
        try:
            category = detect_query_category(search_queries, query)
            scored_urls = await semantic_filter.filter_results(
                all_results,
                max_results=discovery_profile.max_crawl_urls,
                threshold_override=discovery_profile.semantic_threshold,
                category=category,
                query=query,
            )
            filtered_urls = [url for url, score in scored_urls]
        except Exception:
            filtered_urls = [url for url, _, _ in all_results]
        
        # Filter already-seen URLs
        unseen_urls = url_cache.filter_unseen(filtered_urls, within_days=7)
        urls_to_process = unseen_urls[:discovery_profile.max_crawl_urls]
        
        # Crawl
        crawl_results = await crawler.crawl_batch(
            urls_to_process, 
            max_concurrent=discovery_profile.max_concurrent_crawls
        )
        
        # Extract and save
        success_count = 0
        extraction_semaphore = asyncio.Semaphore(8)
        
        async def extract_and_save(crawl_result):
            nonlocal success_count
            
            if not crawl_result.success:
                url_cache.mark_seen(crawl_result.url, "failed", expires_days=7)
                return
            
            if len(crawl_result.markdown or '') < 100:
                url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30)
                return
            
            async with extraction_semaphore:
                try:
                    extraction = await extractor.extract(crawl_result.markdown, crawl_result.url)
                    
                    if not extraction.success or not extraction.opportunity_card:
                        url_cache.mark_seen(crawl_result.url, "failed", expires_days=14)
                        return
                    
                    opp = extraction.opportunity_card
                    confidence = extraction.confidence or 0.0
                    
                    if confidence < 0.4:
                        url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30)
                        return
                    
                    if opp.title == "Unknown Opportunity":
                        url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30)
                        return
                    
                    # Skip expired one-time opportunities
                    if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                        url_cache.mark_seen(crawl_result.url, "expired", expires_days=365)
                        return
                    
                    # Save to database
                    await sync.upsert_opportunity(opp)
                    url_cache.mark_seen(crawl_result.url, "success", expires_days=opp.recheck_days)
                    success_count += 1
                    
                except Exception:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14)
        
        tasks = [extract_and_save(cr) for cr in crawl_results]
        await asyncio.gather(*tasks)
        
        return {"count": success_count + len(database_matches)}
        
    finally:
        await sync.close()


async def run_batch_discovery(
    focus_areas: Optional[List[str]],
    limit: int,
    sources: Optional[List[str]],
    db_url: str,
) -> Dict[str, Any]:
    """
    Run batch discovery flow.
    
    Simplified version of scripts/batch_discovery.py BatchDiscovery.run().
    """
    from src.sources.curated_sources import get_all_curated_urls
    from src.sources.sitemap_crawler import get_sitemap_crawler
    from src.db.models import OpportunityTiming
    
    profile = get_discovery_profile("daily")
    
    # Default focus areas
    if not focus_areas:
        focus_areas = [
            "STEM competitions high school 2026",
            "summer research programs high school",
            "internships for high school students",
            "scholarships high school seniors",
            "volunteer opportunities teenagers",
        ]
    
    # Default sources
    if not sources:
        sources = ["curated", "sitemaps", "search", "recheck"]
    
    # Initialize components
    url_cache = get_url_cache()
    sitemap_crawler = get_sitemap_crawler()
    discovery_agent = get_discovery_agent()
    crawler = get_hybrid_crawler()
    extractor = get_extractor()
    sync = PostgresSync(db_url)
    await sync.connect()
    
    try:
        all_urls = set()
        
        # Curated sources
        if "curated" in sources:
            curated_urls = get_all_curated_urls()
            unseen = url_cache.filter_unseen(curated_urls, within_days=14)
            all_urls.update(unseen[:limit])
        
        # Sitemaps
        if "sitemaps" in sources:
            base_urls = get_all_curated_urls()[:20]
            sitemap_urls = await sitemap_crawler.crawl_multiple_domains(
                base_urls,
                filter_opportunities=True,
                max_urls_per_domain=10,
            )
            unseen = url_cache.filter_unseen(sitemap_urls, within_days=14)
            all_urls.update(unseen[:limit])
        
        # Search
        if "search" in sources:
            for focus in focus_areas[:5]:
                try:
                    urls = await discovery_agent.run(
                        focus_area=focus,
                        max_iterations=1,
                        target_url_count=50,
                    )
                    unseen = url_cache.filter_unseen(list(urls), within_days=7)
                    all_urls.update(unseen)
                    if len(all_urls) >= limit:
                        break
                except Exception:
                    continue
        
        # Recheck queue
        if "recheck" in sources:
            pending = url_cache.get_pending_rechecks(limit=limit)
            all_urls.update(url for url, status in pending)
        
        # Limit total
        urls_to_process = list(all_urls)[:limit * 2]
        
        # Crawl
        crawl_results = await crawler.crawl_batch(
            urls_to_process,
            max_concurrent=profile.max_concurrent_crawls,
        )
        
        # Extract and save
        successful = 0
        failed = 0
        extraction_semaphore = asyncio.Semaphore(8)
        
        async def extract_and_save(crawl_result):
            nonlocal successful, failed
            
            if not crawl_result.success:
                url_cache.mark_seen(crawl_result.url, "failed", expires_days=7)
                failed += 1
                return
            
            if len(crawl_result.markdown or '') < 100:
                url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30)
                failed += 1
                return
            
            async with extraction_semaphore:
                try:
                    extraction = await extractor.extract(crawl_result.markdown, crawl_result.url)
                    
                    if not extraction.success or not extraction.opportunity_card:
                        url_cache.mark_seen(crawl_result.url, "failed", expires_days=14)
                        failed += 1
                        return
                    
                    opp = extraction.opportunity_card
                    confidence = extraction.confidence or 0.0
                    
                    if confidence < 0.4:
                        url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30)
                        failed += 1
                        return
                    
                    if opp.title == "Unknown Opportunity":
                        url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30)
                        failed += 1
                        return
                    
                    if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                        url_cache.mark_seen(crawl_result.url, "expired", expires_days=365)
                        failed += 1
                        return
                    
                    await sync.upsert_opportunity(opp)
                    url_cache.mark_seen(crawl_result.url, "success", expires_days=opp.recheck_days)
                    successful += 1
                    
                except Exception:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14)
                    failed += 1
        
        tasks = [extract_and_save(cr) for cr in crawl_results]
        await asyncio.gather(*tasks)
        
        return {
            "successful": successful,
            "failed": failed,
            "total_processed": len(crawl_results),
        }
        
    finally:
        await sync.close()


def _is_social_domain(url: str) -> bool:
    """Detect if URL is from social media."""
    social_domains = {
        'reddit.com', 'facebook.com', 'twitter.com', 'x.com',
        'quora.com', 'discord.com', 'instagram.com',
    }
    try:
        from urllib.parse import urlparse
        domain = urlparse(url).hostname or ""
        return any(d in domain for d in social_domains)
    except:
        return False


# ── Circuit breaker for SearXNG ──────────────────────────────────────
_searxng_circuit_open = False          # True = SearXNG is known-down, skip it
_searxng_fail_count = 0                # Consecutive failures
_SEARXNG_FAIL_THRESHOLD = 2           # Open circuit after this many failures
_SEARXNG_FAST_TIMEOUT = 5             # Seconds — fast probe timeout per attempt


async def _search_with_fallback(query: str, max_results: int = 10):
    """
    Try SearXNG first (with circuit breaker), fallback to DuckDuckGo.

    Circuit breaker: After 2 consecutive SearXNG failures, all subsequent
    queries skip SearXNG entirely and go straight to DuckDuckGo.
    """
    global _searxng_circuit_open, _searxng_fail_count

    # ── Try SearXNG (unless circuit is open) ──
    if not _searxng_circuit_open:
        try:
            # Create a FRESH client with fast timeout to avoid mutating the singleton
            settings = get_settings()
            searxng_url = getattr(settings, 'searxng_url', 'http://localhost:8080')
            fast_timeout = aiohttp.ClientTimeout(total=_SEARXNG_FAST_TIMEOUT)

            async with aiohttp.ClientSession(timeout=fast_timeout) as session:
                params = {'q': query, 'format': 'json', 'language': 'en', 'safesearch': 0}
                async with session.get(f"{searxng_url}/search", params=params) as resp:
                    if resp.status != 200:
                        raise aiohttp.ClientError(f"SearXNG status {resp.status}")
                    data = await resp.json()

            from src.search.searxng_client import SearchResult as SxResult
            results = [
                SxResult(url=r['url'], title=r.get('title', ''), snippet=r.get('content', ''), engine=r.get('engine', ''))
                for r in data.get('results', [])[:max_results]
                if r.get('url')
            ]
            if results:
                _searxng_fail_count = 0
                return results
            else:
                _searxng_fail_count += 1
        except Exception as e:
            _searxng_fail_count += 1
            sys.stderr.write(
                f"[Search] SearXNG failed ({_searxng_fail_count}/{_SEARXNG_FAIL_THRESHOLD}) "
                f"for '{query[:50]}': {type(e).__name__}: {str(e)[:80]}\n"
            )

        if _searxng_fail_count >= _SEARXNG_FAIL_THRESHOLD:
            _searxng_circuit_open = True
            sys.stderr.write(
                f"[Search] Circuit breaker OPEN — skipping SearXNG for remaining queries\n"
            )

    # ── Fallback: DuckDuckGo (with timeout) ──
    try:
        ddg_client = get_duckduckgo_client()
        results = await asyncio.wait_for(
            ddg_client.search(query, max_results=max_results),
            timeout=20,
        )
        return results
    except asyncio.TimeoutError:
        sys.stderr.write(f"[Search] DuckDuckGo timed out (20s) for '{query[:50]}'\n")
        return []
    except Exception as e:
        sys.stderr.write(f"[Search] DuckDuckGo also failed for '{query[:50]}': {str(e)[:100]}\n")
        return []


@app.get("/discover/stream")
async def discovery_stream(
    query: str,
    userProfileId: Optional[str] = None,
    profile: str = "quick",
    token: str = Depends(verify_token),
):
    """
    Stream discovery events as Server-Sent Events (SSE).
    """
    if not query or len(query) < 3:
        raise HTTPException(
            status_code=400,
            detail="Query must be at least 3 characters"
        )

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(
            status_code=500,
            detail="DATABASE_URL not configured"
        )

    async def event_generator():
        from src.embeddings import get_embeddings
        from src.db.vector_db import get_vector_db
        from src.db.models import (
            OpportunityTiming, ContentType,
            OpportunityCard, OpportunityCategory, OpportunityType, LocationType,
        )
        import time
        from collections import Counter
        import re
        from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

        start_time = time.time()
        discovery_profile = get_discovery_profile(profile)
        settings = get_settings()
        
        # Helper to yield JSON events
        def emit(event_type: str, data: dict):
            return f"event: {event_type}\ndata: {json.dumps({'type': event_type, **data})}\n\n"

        yield emit("layer_start", {
            "layer": "query_generation", 
            "message": f"Analyzing: '{query}'",
            "profile": discovery_profile.name
        })

        # Initialize components
        search_client = get_searxng_client()
        query_generator = get_query_generator()
        crawler = get_hybrid_crawler()
        extractor = get_extractor()
        url_cache = get_url_cache()
        sync = PostgresSync(db_url)
        await sync.connect()

        try:
            # Phase 0: Database Search
            yield emit("layer_start", {"layer": "database_search", "message": "Searching your library..."})
            try:
                # Direct query for existing matches
                from supabase import create_client
                client = sync._get_client()
                search_pattern = f"%{query}%"
                existing = client.table("opportunities").select("*").or_(
                    f"title.ilike.{search_pattern},company.ilike.{search_pattern}"
                ).limit(5).execute()
                
                if existing.data:
                    for opp in existing.data:
                        yield emit("opportunity_found", {
                            "id": opp.get("id"),
                            "title": opp.get("title"),
                            "organization": opp.get("company"),
                            "url": opp.get("url"),
                            "category": opp.get("category", "Other"),
                            "source": "database",
                            "confidence": 1.0
                        })
                
                yield emit("layer_complete", {
                    "layer": "database_search",
                    "stats": {"found": len(existing.data) if existing.data else 0}
                })
            except Exception as e:
                sys.stderr.write(f"[Stream] Database search error: {e}\n")
                yield emit("layer_complete", {"layer": "database_search", "stats": {"found": 0}})

            # Generate two-stage search queries
            yield emit("reasoning", {"layer": "query_generation", "thought": "Using two-stage search (institutional + social fallback)..."})
            try:
                search_queries_two_stage = await query_generator.generate_two_stage_queries(query)
                all_queries = search_queries_two_stage["institutional"] + search_queries_two_stage["social"]
            except Exception as e:
                sys.stderr.write(f"Two-stage query generation failed: {e}. Falling back to single-stage.\n")
                try:
                    all_queries = await query_generator.generate_queries(query, count=discovery_profile.max_queries)
                    search_queries_two_stage = {"institutional": all_queries, "social": []}
                except Exception:
                    current_year = datetime.now().year
                    all_queries = [
                        f"high school {query} summer program {current_year}",
                        f"{query} internship for high school students",
                        f"{query} research opportunities for high schoolers",
                        f"{query} competitions high school {current_year}",
                        f"{query} volunteer work for teens",
                    ]
                    search_queries_two_stage = {"institutional": all_queries, "social": []}

            query_category = detect_query_category(all_queries, query)
            yield emit("layer_complete", {
                "layer": "query_generation",
                "stats": {"count": len(all_queries), "institutional": len(search_queries_two_stage["institutional"]), "social": len(search_queries_two_stage["social"])},
                "items": all_queries
            })

            # Two-stage search phase — concurrent queries with circuit breaker
            yield emit("layer_start", {"layer": "web_search", "message": f"Stage 1: Institutional search..."})

            all_results = []
            seen_urls = set()
            url_metadata = {}  # Store rich metadata for synthesis

            # Reset circuit breaker for each discovery run
            global _searxng_circuit_open, _searxng_fail_count
            _searxng_circuit_open = False
            _searxng_fail_count = 0

            # ── Helper: run queries with limited concurrency ──
            async def _run_batch(queries, stage, max_per_query=10):
                """Run search queries with limited concurrency to avoid rate limits."""
                search_sem = asyncio.Semaphore(3)  # Max 3 concurrent searches

                async def _single(idx, q):
                    await asyncio.sleep(idx * 0.5)  # Stagger launches by 0.5s
                    async with search_sem:
                        try:
                            r = await asyncio.wait_for(
                                _search_with_fallback(q, max_results=max_per_query),
                                timeout=20,
                            )
                            return (q, r)
                        except asyncio.TimeoutError:
                            sys.stderr.write(f"[Two-Stage] {stage} query timed out: {q[:50]}\n")
                            return (q, [])
                        except Exception as e:
                            sys.stderr.write(f"[Two-Stage] {stage} query failed ({q[:50]}): {str(e)[:80]}\n")
                            return (q, [])
                return await asyncio.gather(*[_single(i, q) for i, q in enumerate(queries)])

            # Stage 1: Institutional search (concurrent)
            institutional_queries = search_queries_two_stage["institutional"]
            for sq in institutional_queries:
                yield emit("search", {"query": sq, "stage": "institutional"})

            stage1_results = await _run_batch(institutional_queries, "Stage 1")

            for search_query, results in stage1_results:
                for result in results:
                    if result.url not in seen_urls:
                        seen_urls.add(result.url)
                        all_results.append((result.url, result.title or "", result.snippet or ""))
                        url_metadata[result.url] = {
                            "title": result.title or "",
                            "snippet": result.snippet or "",
                            "stage": "institutional",
                            "domain": urlparse(result.url).hostname,
                            "query_origin": search_query,
                            "is_social": _is_social_domain(result.url),
                        }
                        yield emit("found", {"url": result.url, "source": result.title or "Web Result", "stage": "institutional"})

            # Check if we need social fallback
            valid_institutional = len([u for u in all_results if not _is_social_domain(u[0])])
            sys.stderr.write(f"[Two-Stage] Stage 1 complete: {valid_institutional} institutional results\n")

            if valid_institutional < 8 and search_queries_two_stage["social"]:
                # Stage 2: Social fallback (concurrent)
                yield emit("layer_start", {"layer": "web_search", "message": f"Stage 2: Social fallback (found {valid_institutional} < 8 institutional results)..."})
                social_queries = search_queries_two_stage["social"]
                for sq in social_queries:
                    yield emit("search", {"query": sq, "stage": "social"})

                stage2_results = await _run_batch(social_queries, "Stage 2")

                for search_query, results in stage2_results:
                    for result in results:
                        if result.url not in seen_urls:
                            seen_urls.add(result.url)
                            all_results.append((result.url, result.title or "", result.snippet or ""))
                            url_metadata[result.url] = {
                                "title": result.title or "",
                                "snippet": result.snippet or "",
                                "stage": "social",
                                "domain": urlparse(result.url).hostname,
                                "query_origin": search_query,
                                "is_social": _is_social_domain(result.url),
                            }
                            yield emit("found", {"url": result.url, "source": result.title or "Web Result", "stage": "social"})
                sys.stderr.write(f"[Two-Stage] Stage 2 complete: total {len(all_results)} results ({len([u for u in all_results if _is_social_domain(u[0])])} social)\n")
            else:
                sys.stderr.write(f"[Two-Stage] Skipping Stage 2 (sufficient institutional results)\n")
            
            yield emit("layer_complete", {
                "layer": "web_search",
                "stats": {"total": len(all_results), "queries": len(all_queries)}
            })

            # ── Safety net: if ALL search engines returned 0 results ──
            if not all_results:
                backends = getattr(app.state, 'search_backends', {})
                sys.stderr.write(
                    f"[Stream] CRITICAL: Zero search results from all engines!\n"
                    f"[Stream] Search backends: {backends}\n"
                    f"[Stream] Queries attempted: {len(all_queries)}\n"
                )
                yield emit("error", {
                    "type": "error",
                    "message": "Search engines returned no results. This may indicate a backend configuration issue.",
                    "details": {
                        "queries_attempted": len(all_queries),
                        "backends": backends,
                    }
                })
                yield emit("complete", {"count": 0, "message": "No search results — check backend logs."})
                return

            # Semantic filtering
            yield emit("layer_start", {"layer": "semantic_filter", "message": "Applying AI relevance filter..."})
            semantic_filter = get_semantic_filter()
            try:
                scored_urls = await semantic_filter.filter_results(
                    all_results,
                    max_results=discovery_profile.max_crawl_urls,
                    threshold_override=discovery_profile.semantic_threshold,
                    category=query_category,
                    query=query,
                )
                filtered_urls = [url for url, score in scored_urls]
            except Exception:
                filtered_urls = [url for url, _, _ in all_results]
            
            yield emit("layer_complete", {
                "layer": "semantic_filter",
                "stats": {"input": len(all_results), "output": len(filtered_urls)},
                "items": filtered_urls
            })

            # Intent-based URL filtering: drop guide/blog URLs for strict intents
            STRICT_INTENTS = {
                "competitions": True, "internships": True, "scholarships": True, "research": True,
            }
            AGGREGATOR_DOMAINS = {
                "scioly.org", "artofproblemsolving.com", "cmu.edu", "mit.edu",
                "stanford.edu", "collegeboard.org", "fastweb.com",
                "scholarships.com", "internships.com", "idealist.org",
                "volunteermatch.org", "science-fair-coach.com",
            }
            GUIDE_URL_PATTERNS = [
                "/blog/", "/news/", "/article/", "/guides/", "/guide/",
                "/how-to/", "/tips/", "/top-", "/best-", "/list-", "/lists/",
            ]
            GUIDE_URL_KEYWORDS = ["top-10", "top-20", "best-", "ultimate-guide", "how-to", "ranking", "list-of"]

            is_strict_intent = query_category in STRICT_INTENTS
            if is_strict_intent:
                intent_filtered = []
                intent_dropped = 0
                for url in filtered_urls:
                    url_lower = url.lower()
                    is_agg = any(d in url_lower for d in AGGREGATOR_DOMAINS)
                    has_guide = any(p in url_lower for p in GUIDE_URL_PATTERNS) or any(k in url_lower for k in GUIDE_URL_KEYWORDS)
                    if has_guide and not is_agg:
                        intent_dropped += 1
                        sys.stderr.write(f"[Stream] Intent filter dropped: {url}\n")
                    else:
                        intent_filtered.append(url)
                # Safety net: never drop ALL results — keep at least 5
                if len(intent_filtered) >= 5 or not filtered_urls:
                    filtered_urls = intent_filtered
                else:
                    sys.stderr.write(f"[Stream] Intent filter would leave only {len(intent_filtered)} URLs — keeping all {len(filtered_urls)}\n")
                if intent_dropped:
                    sys.stderr.write(f"[Stream] Intent filter: dropped {intent_dropped} guide URLs for {query_category} query\n")

            # Smart deduplication: skip fresh (<30d), re-scrape stale (>30d), crawl new
            FRESHNESS_DAYS = 30
            fresh_urls = url_cache.batch_check_seen(filtered_urls, within_days=FRESHNESS_DAYS)
            all_seen_urls = url_cache.batch_check_seen(filtered_urls, within_days=None)

            dedup_stats = {"new": 0, "stale_refreshed": 0, "fresh_skipped": 0}
            urls_to_process = []
            for url in filtered_urls:
                if url in fresh_urls:
                    dedup_stats["fresh_skipped"] += 1
                elif url in all_seen_urls:
                    dedup_stats["stale_refreshed"] += 1
                    urls_to_process.append(url)
                else:
                    dedup_stats["new"] += 1
                    urls_to_process.append(url)

            urls_to_process = urls_to_process[:discovery_profile.max_crawl_urls]

            sys.stderr.write(
                f"[Stream] Dedup: new={dedup_stats['new']} "
                f"stale={dedup_stats['stale_refreshed']} "
                f"fresh_skipped={dedup_stats['fresh_skipped']}\n"
            )

            if not urls_to_process:
                # Check if this is because searches found nothing or everything was cached
                if not all_results:
                    sys.stderr.write(f"[Two-Stage] ERROR: No search results found! Stage 1: {valid_institutional} institutional, Stage 2: {len([u for u in all_results if _is_social_domain(u[0])])} social\n")
                    yield emit("complete", {"count": 0, "message": "No opportunities found for this search. Try different keywords."})
                else:
                    sys.stderr.write(f"[Two-Stage] All {len(all_results)} results already cached\n")
                    yield emit("complete", {"count": 0, "message": "All results are already in your library"})
                return

            # Crawl
            yield emit("layer_start", {"layer": "parallel_crawl", "message": f"Crawling {len(urls_to_process)} URLs..."})
            for url in urls_to_process:
                yield emit("analyzing", {"url": url})
            
            crawl_results = await crawler.crawl_batch(
                urls_to_process, 
                max_concurrent=discovery_profile.max_concurrent_crawls
            )
            
            crawl_success = sum(1 for r in crawl_results if r.success)
            yield emit("layer_complete", {
                "layer": "parallel_crawl",
                "stats": {"total": len(urls_to_process), "completed": crawl_success, "failed": len(urls_to_process) - crawl_success}
            })

            # Extract and save
            yield emit("layer_start", {"layer": "ai_extraction", "message": f"Extracting from {crawl_success} pages..."})

            success_count = [0]
            extraction_semaphore = asyncio.Semaphore(discovery_profile.max_concurrent_extractions)

            # The Five-Layer Shield Synthesis Function (Stage-Aware)
            def synthesize_opportunity(url: str, metadata: dict = None):
                """
                GUARANTEED to return an OpportunityCard with a useful title.
                Stage-aware: labels social sources appropriately.
                """
                from urllib.parse import urlparse

                try:
                    parsed = urlparse(url)
                    hostname = (parsed.hostname or "").replace("www.", "") if parsed.hostname else "web-resource"

                    # Detect stage and social status
                    stage = metadata.get("stage", "unknown") if metadata else "unknown"
                    is_social = metadata.get("is_social", False) if metadata else False

                    # Layer 3: Try Search Engine Title (highest quality)
                    title = None
                    if metadata and metadata.get("title"):
                        title = metadata["title"].strip()[:100]
                        # If social source, prefix for transparency
                        if is_social and not title.lower().startswith(("reddit:", "community:", "forum:")):
                            if "reddit" in hostname:
                                title = f"Community: {title}"
                            elif "facebook" in hostname or "quora" in hostname:
                                title = f"Forum: {title}"

                    # Layer 4: Try URL Path Decoding
                    if not title:
                        path_segments = [p for p in parsed.path.split('/') if len(p) > 2]
                        if path_segments:
                            # Take last 1-2 segments, clean them up
                            relevant_parts = path_segments[-2:] if len(path_segments) >= 2 else path_segments[-1:]
                            title = " - ".join(p.replace('-', ' ').replace('_', ' ').title() for p in relevant_parts)

                    # Layer 5: Domain Baseline (guaranteed fallback)
                    if not title or len(title) < 3:
                        domain_parts = hostname.split('.')
                        base = domain_parts[0].capitalize()
                        title = f"{base} Program" if not is_social else f"{base} Discussion"

                    # Use search snippet if available
                    summary = ""
                    if metadata and metadata.get("snippet"):
                        summary = metadata["snippet"][:200]
                    if not summary:
                        summary = f"Explore this opportunity directly on {hostname}."

                    # Tags based on source stage
                    tags = ["auto-generated"]
                    if is_social:
                        tags.append("community-reported")
                    if stage == "institutional":
                        tags.append("institutional")
                    elif stage == "social":
                        tags.append("social-media")

                    # Lower confidence for social sources
                    confidence = 0.4 if not is_social else 0.3

                    return OpportunityCard(
                        url=url,
                        title=title[:100],  # Ensure title fits in database
                        summary=summary,
                        organization=hostname,
                        content_type=ContentType.OPPORTUNITY,
                        category=OpportunityCategory.OTHER,
                        opportunity_type=OpportunityType.OTHER,
                        tags=tags,  # Stage-aware tags
                        grade_levels=[9, 10, 11, 12],
                        location_type=LocationType.ONLINE,
                        extraction_confidence=confidence,  # Stage-aware confidence
                        timing_type=OpportunityTiming.ONGOING,
                        is_expired=False,
                        recheck_days=30 if not is_social else 7,  # Social content changes faster
                    )
                except Exception as e:
                    # FINAL FALLBACK: Even if everything fails, return something
                    sys.stderr.write(f"[Synthesis] Error synthesizing {url}: {e}\n")
                    return OpportunityCard(
                        url=url if url else "https://example.com",
                        title="Opportunity",
                        summary="Visit the link to learn more.",
                        organization="Unknown",
                        content_type=ContentType.OPPORTUNITY,
                        category=OpportunityCategory.OTHER,
                        opportunity_type=OpportunityType.OTHER,
                        tags=["fallback"],
                        grade_levels=[9, 10, 11, 12],
                        location_type=LocationType.ONLINE,
                        extraction_confidence=0.2,
                        timing_type=OpportunityTiming.ONGOING,
                        is_expired=False,
                        recheck_days=7,
                    )

            EXTRACTION_TIMEOUT = 30  # seconds per URL — hard cap

            async def extract_and_save(crawl_result):
                """FAIL-SAFE: This function CANNOT return an empty list."""

                # SHIELD LAYER: Crawl failure
                if not crawl_result.success:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=7)
                    sys.stderr.write(f"[Stream] Crawl failed for {crawl_result.url}, synthesizing...\n")
                    return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

                async with extraction_semaphore:
                    try:
                        extraction = await asyncio.wait_for(
                            extractor.extract(crawl_result.markdown, crawl_result.url),
                            timeout=EXTRACTION_TIMEOUT,
                        )

                        # SHIELD LAYER: Successful AI extraction
                        if extraction.success and extraction.opportunity_card:
                            # Double-check for "Unknown Opportunity" zombie cards
                            if "unknown" in extraction.opportunity_card.title.lower():
                                sys.stderr.write(f"[Stream] Zombie card detected for {crawl_result.url}, synthesizing...\n")
                                url_cache.mark_seen(crawl_result.url, "synthesized", expires_days=7)
                                return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

                            # Valid extraction - save all opportunities (including list extractions)
                            opps = extraction.list_opportunities or [extraction.opportunity_card]
                            saved = []
                            for opp in opps:
                                try:
                                    await sync.upsert_opportunity(opp)
                                    saved.append(opp)
                                except Exception as e:
                                    sys.stderr.write(f"[Stream] Sync failed for {opp.title}: {e}\n")

                            if saved:
                                url_cache.mark_seen(crawl_result.url, "success", expires_days=saved[0].recheck_days)
                                success_count[0] += len(saved)
                                return saved
                            else:
                                # All saves failed - synthesize
                                sys.stderr.write(f"[Stream] All saves failed for {crawl_result.url}, synthesizing...\n")
                                url_cache.mark_seen(crawl_result.url, "synthesized", expires_days=7)
                                return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

                        # SHIELD LAYER: AI extraction failed
                        reason = extraction.error or "unknown"
                        sys.stderr.write(f"[Stream] Extraction failed for {crawl_result.url}: {reason}, synthesizing...\n")
                        url_cache.mark_seen(crawl_result.url, "synthesized", expires_days=7)
                        return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

                    except asyncio.TimeoutError:
                        # SHIELD LAYER: Extraction timed out
                        sys.stderr.write(f"[Stream] Extraction TIMED OUT ({EXTRACTION_TIMEOUT}s) for {crawl_result.url}, synthesizing...\n")
                        url_cache.mark_seen(crawl_result.url, "failed", expires_days=7)
                        return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

                    except Exception as e:
                        # SHIELD LAYER: Catastrophic failure
                        sys.stderr.write(f"[Stream] Exception extracting {crawl_result.url}: {e}, synthesizing...\n")
                        url_cache.mark_seen(crawl_result.url, "failed", expires_days=14)
                        return [synthesize_opportunity(crawl_result.url, url_metadata.get(crawl_result.url))]

            tasks = [extract_and_save(cr) for cr in crawl_results]
            results = await asyncio.gather(*tasks)

            # Flatten: each task returns a list of opportunities
            for opp_list in results:
                for opp in (opp_list or []):
                    yield emit("opportunity_found", {
                        "id": opp.id,
                        "title": opp.title,
                        "organization": opp.organization,
                        "url": opp.url,
                        "category": opp.category.value if opp.category else "Other",
                        "opportunityType": opp.opportunity_type.value if opp.opportunity_type else "Other",
                        "locationType": opp.location_type.value if opp.location_type else "Online",
                        "confidence": opp.extraction_confidence,
                    })

            total_time = time.time() - start_time
            yield emit("complete", {
                "count": success_count[0],
                "metrics": {
                    "total_time_seconds": round(total_time, 2),
                    "dedup": dedup_stats,
                },
            })
            yield emit("done", {"code": 0})

        finally:
            await sync.close()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


# ══════════════════════════════════════════════════════════════════════════════
# JIT Summarization Endpoint
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/summarize", response_model=SummarizeResponse)
async def summarize_opportunity(
    request: SummarizeRequest,
    token: str = Depends(verify_token),
):
    """
    Generate JIT summary for an opportunity.

    Fetches the URL, extracts main content, and uses Gemini to generate
    structured summary with hallucination detection and dead link handling.
    """
    start_time = datetime.utcnow()

    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise HTTPException(status_code=500, detail="DATABASE_URL not configured")

    try:
        # Check cache unless force_refresh
        if not request.force_refresh:
            sync = PostgresSync(db_url)
            await sync.connect()
            try:
                client = sync._get_client()
                existing = client.table("opportunities").select("summary_json, last_summarized_at").eq("id", request.opportunity_id).maybeSingle().execute()

                if existing.data and existing.data.get("summary_json"):
                    # Cache hit
                    duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                    return SummarizeResponse(
                        success=True,
                        summary=existing.data["summary_json"],
                        cached=True,
                        processing_time_ms=duration_ms
                    )
            finally:
                await sync.close()

        # Generate summary
        summarizer = get_summarizer()
        success, summary, error = await summarizer.summarize(request.url, timeout_seconds=15)

        if not success:
            raise HTTPException(status_code=500, detail=error or "Summarization failed")

        # Save to database
        sync = PostgresSync(db_url)
        await sync.connect()
        try:
            client = sync._get_client()
            client.table("opportunities").update({
                "summary_json": summary.model_dump(),
                "last_summarized_at": datetime.utcnow().isoformat(),
                "is_expired": summary.is_expired
            }).eq("id", request.opportunity_id).execute()
        finally:
            await sync.close()

        duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)

        return SummarizeResponse(
            success=True,
            summary=summary,
            cached=False,
            processing_time_ms=duration_ms
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)[:200])


# For running with uvicorn
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
