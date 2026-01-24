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
from src.search.semantic_filter import get_semantic_filter
from src.agents.extractor import get_extractor
from src.agents.query_generator import get_query_generator
from src.agents.discovery import get_discovery_agent
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.db.url_cache import get_url_cache


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


# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint (no auth required)."""
    return HealthResponse(
        status="ok",
        timestamp=datetime.utcnow().isoformat(),
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
    
    try:
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
            scored_urls = await semantic_filter.filter_results(
                all_results,
                max_results=discovery_profile.max_crawl_urls,
                threshold_override=discovery_profile.semantic_threshold,
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
        
        return {"count": success_count}
        
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


# For running with uvicorn
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
