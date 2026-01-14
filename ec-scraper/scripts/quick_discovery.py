"""Quick discovery script for on-demand user searches with JSON event streaming.

Supports both global discovery and personalized user-triggered discovery.
Optimized for performance with parallel crawling and extraction.
"""
import argparse
import asyncio
import os
import sys
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# Load env first
load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.search.searxng_client import get_searxng_client
from src.search.semantic_filter import get_semantic_filter
from src.agents.extractor import get_extractor
from src.agents.query_generator import get_query_generator
from src.agents.discovery import get_discovery_agent
from src.crawlers.crawl4ai_client import get_crawler
from src.api.postgres_sync import PostgresSync
from src.config import get_settings
from src.embeddings import get_embeddings
from src.db.vector_db import get_vector_db
from src.db.url_cache import get_url_cache
from src.db.models import OpportunityTiming


def emit_event(type: str, data: dict):
    """Emit a JSON event to stdout."""
    event = {"type": type, **data}
    print(json.dumps(event), flush=True)
    sys.stdout.flush()


async def fetch_user_profile(user_profile_id: str, db_url: str) -> Optional[Dict[str, Any]]:
    """
    Fetch user profile from PostgreSQL database.
    
    Args:
        user_profile_id: The user ID to fetch profile for
        db_url: PostgreSQL connection URL
        
    Returns:
        User profile dict or None if not found
    """
    import asyncpg
    import ssl
    
    try:
        # Create SSL context
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        conn = await asyncpg.connect(db_url, ssl=ssl_context)
        
        try:
            # Query user profile from database
            # First try UserProfile table, then fall back to User table
            profile_row = await conn.fetchrow('''
                SELECT 
                    up.id,
                    up."userId",
                    up.interests,
                    up.location,
                    up.grade_level,
                    up.career_goals,
                    up.preferred_opportunity_types,
                    up.academic_strengths,
                    up.availability,
                    u.name
                FROM "UserProfile" up
                JOIN "User" u ON up."userId" = u.id
                WHERE up."userId" = $1
            ''', user_profile_id)
            
            if profile_row:
                return {
                    "user_id": profile_row["userId"],
                    "name": profile_row["name"],
                    "interests": profile_row["interests"] or [],
                    "location": profile_row["location"] or "Any",
                    "grade_level": profile_row["grade_level"] or 11,
                    "career_goals": profile_row["career_goals"],
                    "preferred_ec_types": profile_row["preferred_opportunity_types"] or [],
                    "academic_strengths": profile_row["academic_strengths"] or [],
                    "availability": profile_row["availability"] or "Flexible",
                }
            
            # If no UserProfile, try to get basic user info
            user_row = await conn.fetchrow('''
                SELECT id, name, headline, location
                FROM "User"
                WHERE id = $1
            ''', user_profile_id)
            
            if user_row:
                # Create a basic profile from user info
                return {
                    "user_id": user_row["id"],
                    "name": user_row["name"],
                    "interests": [],  # Will be inferred from headline if available
                    "location": user_row["location"] or "Any",
                    "grade_level": 11,  # Default
                    "career_goals": user_row["headline"],
                    "preferred_ec_types": [],
                    "academic_strengths": [],
                    "availability": "Flexible",
                }
            
            return None
            
        finally:
            await conn.close()
            
    except Exception as e:
        sys.stderr.write(f"Error fetching user profile: {e}\n")
        return None


async def main(query: str, user_profile_id: Optional[str] = None):
    """
    Main discovery function.
    
    Args:
        query: Search query / focus area
        user_profile_id: Optional user ID for personalized discovery
    """
    emit_event("layer_start", {"layer": "query_generation", "message": f"Analyzing: '{query}'"})
    
    # Get database URL
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")
    
    if not db_url:
        emit_event("error", {"message": "DATABASE_URL not found"})
        return
    
    # Fetch user profile if ID provided
    user_profile = None
    if user_profile_id:
        emit_event("plan", {"message": "Fetching user profile for personalized discovery..."})
        user_profile = await fetch_user_profile(user_profile_id, db_url)
        if user_profile:
            name = user_profile.get("name", "user")
            emit_event("plan", {"message": f"Personalizing search for {name}"})
        else:
            emit_event("plan", {"message": "User profile not found, using global discovery"})
    
    # Get settings (defaults to Google Gemini)
    settings = get_settings()

    # Initialize components
    search_client = get_searxng_client()
    query_generator = get_query_generator()
    crawler = get_crawler()
    extractor = get_extractor()
    url_cache = get_url_cache()
    sync = PostgresSync(db_url)
    await sync.connect()

    # Initialize embeddings and vector DB (only if enabled - uses Google Gemini embeddings)
    embeddings = None
    vector_db = None
    if settings.use_embeddings:
        try:
            embeddings = get_embeddings()
            vector_db = get_vector_db()
        except Exception as e:
            sys.stderr.write(f"⚠ Failed to initialize embeddings: {e}\n")
    
    # Generate search queries
    if user_profile:
        # Personalized: Use profiler to generate targeted queries
        emit_event("reasoning", {"layer": "query_generation", "thought": "Building personalized queries from profile..."})
        
        # Get the discovery agent which has the profiler logic
        discovery_agent = get_discovery_agent()
        
        # Generate queries based on user profile
        interests = user_profile.get("interests", [])
        location = user_profile.get("location", "")
        career_goals = user_profile.get("career_goals", "")
        preferred_types = user_profile.get("preferred_ec_types", [])
        
        # Build personalized queries
        search_queries = []
        
        # Add interest-based queries
        for interest in interests[:3]:
            search_queries.append(f"{interest} high school opportunities 2026")
            if location and location != "Any":
                search_queries.append(f"{interest} programs {location}")
        
        # Add type-specific queries
        for ptype in preferred_types[:2]:
            search_queries.append(f"high school {ptype} {query} 2026")
        
        # Add career goal query
        if career_goals:
            search_queries.append(f"{career_goals} opportunities high school students")
        
        # Add the base query
        search_queries.append(f"{query} high school opportunities")
        
        # Limit to 5 queries for personalized search
        search_queries = search_queries[:5]
        
    else:
        # Global: Use AI query generator for diverse queries
        emit_event("reasoning", {"layer": "query_generation", "thought": "Using AI to generate diverse queries..."})
        
        try:
            search_queries = await query_generator.generate_queries(query, count=10)
        except Exception as e:
            # Fallback to template-based queries
            current_year = datetime.now().year
            base_query = query.strip()
            search_queries = [
                f"high school {base_query} summer program {current_year}",
                f"{base_query} internship for high school students",
                f"{base_query} research opportunities for high schoolers",
                f"{base_query} competitions high school {current_year}",
                f"{base_query} volunteer work for teens",
            ]
    
    # Emit layer complete for query generation
    emit_event("layer_complete", {
        "layer": "query_generation",
        "stats": {"count": len(search_queries)},
        "items": search_queries
    })
    
    # Search phase - run searches in parallel
    emit_event("layer_start", {"layer": "web_search", "message": f"Searching with {len(search_queries)} queries..."})
    
    async def do_search(search_query: str):
        emit_event("layer_progress", {
            "layer": "web_search",
            "item": search_query,
            "status": "running"
        })
        emit_event("search", {"query": search_query})
        try:
            # Personalized searches get more results per query
            max_results = 15 if user_profile else 10
            results = await search_client.search(search_query, max_results=max_results)
            emit_event("layer_progress", {
                "layer": "web_search",
                "item": search_query,
                "status": "complete",
                "count": len(results)
            })
            return results
        except Exception as e:
            sys.stderr.write(f"Search error: {e}\n")
            emit_event("layer_progress", {
                "layer": "web_search",
                "item": search_query,
                "status": "failed",
                "error": str(e)[:50]
            })
            return []
    
    search_tasks = [do_search(q) for q in search_queries]
    search_results = await asyncio.gather(*search_tasks)
    
    # Collect all results with titles and snippets for semantic filtering
    # Domain blocklist is now handled by SearXNG client
    all_results = []  # List of (url, title, snippet) tuples
    seen_urls = set()
    
    for results in search_results:
        for result in results:
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                all_results.append((result.url, result.title or "", result.snippet or ""))
                emit_event("found", {"url": result.url, "source": result.title or "Web Result"})
    
    emit_event("layer_complete", {
        "layer": "web_search",
        "stats": {"total": len(all_results), "queries": len(search_queries)}
    })
    
    # SEMANTIC FILTERING - Use embeddings to filter relevant results (FAST)
    # This happens BEFORE crawling to save time
    emit_event("layer_start", {"layer": "semantic_filter", "message": "Applying AI relevance filter..."})
    
    semantic_scored_urls = []
    try:
        semantic_filter = get_semantic_filter()
        emit_event("reasoning", {"layer": "semantic_filter", "thought": "Computing embeddings for relevance scoring..."})
        
        # Filter using embeddings (one batch API call for ALL results)
        semantic_scored_urls = await semantic_filter.filter_results(all_results, max_results=40)
        
        emit_event("layer_complete", {
            "layer": "semantic_filter",
            "stats": {"input": len(all_results), "output": len(semantic_scored_urls), "threshold": 0.6}
        })
        
        # Log top results for debugging
        for url, score in semantic_scored_urls[:5]:
            sys.stderr.write(f"  [Semantic] {score:.2f} - {url[:60]}...\n")
        
    except Exception as e:
        # FALLBACK: If semantic filtering fails, use all results
        sys.stderr.write(f"[SemanticFilter] Fallback due to error: {e}\n")
        emit_event("layer_complete", {
            "layer": "semantic_filter",
            "stats": {"input": len(all_results), "output": len(all_results), "fallback": True}
        })
        semantic_scored_urls = [(url, 0.5) for url, _, _ in all_results]
    
    # Get just the URLs (already sorted by relevance score)
    filtered_urls = [url for url, score in semantic_scored_urls]
    
    # Filter out already-seen URLs using cache (check within last 7 days)
    unseen_urls = url_cache.filter_unseen(filtered_urls, within_days=7)
    
    # Process more URLs for personalized searches
    max_urls = 25 if user_profile else 35
    urls_to_process = unseen_urls[:max_urls]
    
    # Start parallel crawl layer
    emit_event("layer_start", {"layer": "parallel_crawl", "message": f"Crawling {len(urls_to_process)} URLs..."})
    
    # Emit analyzing events for all URLs
    for url in urls_to_process:
        emit_event("analyzing", {"url": url})
    
    # Emit parallel status
    emit_event("parallel_status", {
        "layer": "parallel_crawl",
        "active": min(10, len(urls_to_process)),
        "completed": 0,
        "failed": 0,
        "pending": max(0, len(urls_to_process) - 10)
    })
    
    # Process URLs in PARALLEL using crawl_batch for crawling
    crawl_results = await crawler.crawl_batch(urls_to_process, max_concurrent=10)
    
    # Count crawl results
    crawl_success = sum(1 for r in crawl_results if r.success)
    crawl_failed = len(crawl_results) - crawl_success
    
    emit_event("layer_complete", {
        "layer": "parallel_crawl",
        "stats": {"total": len(urls_to_process), "completed": crawl_success, "failed": crawl_failed}
    })
    
    # Start AI extraction layer
    emit_event("layer_start", {"layer": "ai_extraction", "message": f"Extracting from {crawl_success} pages..."})
    
    # Filter successful crawls and extract in parallel
    extraction_semaphore = asyncio.Semaphore(8)
    extraction_count = [0]  # Use list for mutable counter in closure
    
    async def extract_and_save(crawl_result) -> dict | None:
        if not crawl_result.success:
            url_cache.mark_seen(crawl_result.url, "failed", expires_days=7, notes=crawl_result.error)
            return {"error": f"Crawl failed: {crawl_result.error}", "url": crawl_result.url}
        
        content_len = len(crawl_result.markdown or '')
        if content_len < 100:
            url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Content too short")
            return {"error": f"Content too short: {content_len} chars", "url": crawl_result.url}
        
        async with extraction_semaphore:
            try:
                extraction = await extractor.extract(crawl_result.markdown, crawl_result.url)
                if not extraction.success:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=extraction.error)
                    return {"error": f"Extraction failed: {extraction.error}", "url": crawl_result.url}
                
                opp = extraction.opportunity_card
                if not opp:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="No card extracted")
                    return {"error": "No card extracted", "url": crawl_result.url}
                
                # Skip low-confidence extractions
                confidence = extraction.confidence or 0.0
                if confidence < 0.4:
                    url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30, notes=f"Confidence: {confidence:.2f}")
                    return {"error": f"Low confidence: {confidence:.2f}", "url": crawl_result.url}
                
                # Skip generic/invalid extractions
                if opp.title == "Unknown Opportunity" or opp.organization in ["Unknown", None, ""]:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Generic extraction")
                    return {"error": "Generic extraction", "url": crawl_result.url}
                
                # Skip ranking/list articles (common noise)
                title_lower = opp.title.lower()
                if any(skip in title_lower for skip in ['best ', 'top ', 'ranking', 'list of']):
                    url_cache.mark_seen(crawl_result.url, "blocked", expires_days=90, notes="Ranking article")
                    return {"error": f"Ranking article: {opp.title}", "url": crawl_result.url}
                
                # Time-based filtering
                if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                    url_cache.mark_seen(crawl_result.url, "expired", expires_days=365, notes="Expired one-time")
                    return {"error": f"Expired one-time opportunity", "url": crawl_result.url}
                
                # For expired recurring/annual opportunities, set priority recheck
                if opp.is_expired and opp.timing_type in [OpportunityTiming.ANNUAL, OpportunityTiming.RECURRING, OpportunityTiming.SEASONAL]:
                    opp.recheck_days = 3
                
                # Sync to database (contributes to overall database)
                await sync.upsert_opportunity(opp)
                
                # Mark as successfully processed in cache
                url_cache.mark_seen(crawl_result.url, "success", expires_days=opp.recheck_days, notes=opp.title)

                # Emit individual opportunity immediately
                emit_event("layer_progress", {
                    "layer": "ai_extraction",
                    "item": crawl_result.url,
                    "status": "complete",
                    "confidence": confidence,
                    "title": opp.title
                })
                emit_event("opportunity_found", {
                    "id": opp.id,
                    "title": opp.title,
                    "organization": opp.organization,
                    "category": opp.category.value,
                    "type": opp.opportunity_type.value,
                    "url": opp.url,
                    "deadline": opp.deadline.isoformat() if opp.deadline else None,
                    "summary": opp.summary[:150] + "..." if len(opp.summary) > 150 else opp.summary,
                    "location_type": opp.location_type.value,
                    "confidence": confidence,
                    "is_personalized": user_profile is not None,
                })

                # Add to vector DB with embeddings (only if enabled)
                if embeddings and vector_db and settings.use_embeddings:
                    try:
                        emb_vector = embeddings.generate_for_indexing(opp.to_embedding_text())
                        vector_db.add_opportunity_with_embedding(opp, emb_vector)
                    except Exception as emb_err:
                        pass  # Silent fail for embeddings

                return {
                    "success": True,
                    "url": crawl_result.url,
                    "card": {
                        "title": opp.title,
                        "organization": opp.organization,
                        "type": opp.opportunity_type.value,
                        "location": opp.location
                    }
                }
            except Exception as e:
                emit_event("layer_progress", {
                    "layer": "ai_extraction",
                    "item": crawl_result.url,
                    "status": "failed",
                    "error": str(e)[:50]
                })
                return {"error": str(e)[:100], "url": crawl_result.url}
    
    # Run extractions in parallel
    extraction_tasks = [extract_and_save(cr) for cr in crawl_results]
    results = await asyncio.gather(*extraction_tasks)
    
    # Count results
    success_count = 0
    failed_count = 0
    for result in results:
        if result:
            if result.get("success"):
                success_count += 1
                emit_event("extracted", {"card": result["card"]})
            elif result.get("error"):
                failed_count += 1
    
    # Complete AI extraction layer
    emit_event("layer_complete", {
        "layer": "ai_extraction",
        "stats": {"total": len(crawl_results), "completed": success_count, "failed": failed_count}
    })
    
    # DB sync layer (already done inline, just emit completion)
    emit_event("layer_start", {"layer": "db_sync", "message": f"Syncing {success_count} opportunities..."})
    emit_event("layer_complete", {
        "layer": "db_sync",
        "stats": {"inserted": success_count, "updated": 0, "skipped": failed_count}
    })
    
    emit_event("complete", {
        "count": success_count,
        "is_personalized": user_profile is not None,
        "user_id": user_profile.get("user_id") if user_profile else None,
    })
    await sync.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quick opportunity discovery with optional personalization")
    parser.add_argument("query", help="Search query / focus area")
    parser.add_argument("--user-profile-id", help="User ID for personalized discovery", default=None)
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.query, args.user_profile_id))
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.exit(1)
