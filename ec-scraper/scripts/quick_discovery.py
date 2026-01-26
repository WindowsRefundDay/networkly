"""Quick discovery script for on-demand user searches with JSON event streaming.

Supports both global discovery and personalized user-triggered discovery.
Optimized for performance with parallel crawling and extraction.
"""
import argparse
import asyncio
import os
import sys
import json
import re
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, List
from collections import Counter
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
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.api.postgres_sync import PostgresSync
from src.config import get_settings, get_discovery_profile, QUICK_PROFILE
from src.embeddings import get_embeddings
from src.db.vector_db import get_vector_db
from src.db.url_cache import get_url_cache
from src.db.models import OpportunityTiming, ContentType


def emit_event(type: str, data: dict):
    """Emit a JSON event to stdout."""
    event = {"type": type, **data}
    print(json.dumps(event), flush=True)
    sys.stdout.flush()


CATEGORY_HINTS = {
    "competitions": ["competition", "olympiad", "contest", "challenge"],
    "internships": ["internship", "intern", "externship", "work experience"],
    "summer_programs": ["summer program", "camp", "workshop", "course"],
    "scholarships": ["scholarship", "grant", "award", "financial aid"],
    "research": ["research", "lab", "mentorship"],
    "volunteering": ["volunteer", "community service", "nonprofit", "ngo"],
}


def detect_query_category(queries: List[str], fallback: str) -> str:
    """Detect dominant category for adaptive semantic thresholds."""
    counts = {category: 0 for category in CATEGORY_HINTS.keys()}
    combined = " ".join(queries + [fallback]).lower()
    for category, hints in CATEGORY_HINTS.items():
        if any(hint in combined for hint in hints):
            counts[category] += 1
    top_category = max(counts.items(), key=lambda item: item[1])
    if top_category[1] == 0:
        return "general"
    return top_category[0]


TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "mc_cid", "mc_eid",
}


def normalize_url(url: str) -> str:
    """Normalize URL for deduplication."""
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme or "https"
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        path = parsed.path.rstrip("/")
        query_params = [
            (key, value)
            for key, value in parse_qsl(parsed.query, keep_blank_values=False)
            if key.lower() not in TRACKING_PARAMS
        ]
        query = urlencode(query_params, doseq=True)
        normalized = urlunparse((scheme, netloc, path, "", query, ""))
        return normalized
    except Exception:
        return url


def normalize_text(value: str) -> str:
    """Normalize text for title/org dedupe."""
    cleaned = re.sub(r"[^a-z0-9\s]", " ", value.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


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
            # Query user profile from database using Supabase table names
            # First try user_profiles table, then fall back to users table
            profile_row = await conn.fetchrow('''
                SELECT 
                    up.id,
                    up.user_id,
                    up.interests,
                    up.location,
                    up.grade_level,
                    up.career_goals,
                    up.preferred_opportunity_types,
                    up.academic_strengths,
                    up.availability,
                    u.name
                FROM user_profiles up
                JOIN users u ON up.user_id = u.id
                WHERE up.user_id = $1
            ''', user_profile_id)
            
            if profile_row:
                return {
                    "user_id": profile_row["user_id"],
                    "name": profile_row["name"],
                    "interests": profile_row["interests"] or [],
                    "location": profile_row["location"] or "Any",
                    "grade_level": profile_row["grade_level"] or 11,
                    "career_goals": profile_row["career_goals"],
                    "preferred_ec_types": profile_row["preferred_opportunity_types"] or [],
                    "academic_strengths": profile_row["academic_strengths"] or [],
                    "availability": profile_row["availability"] or "Flexible",
                }
            
            # If no user_profiles, try to get basic user info from users table
            user_row = await conn.fetchrow('''
                SELECT id, name, headline, location
                FROM users
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


async def main(
    query: str,
    user_profile_id: Optional[str] = None,
    profile: str = "quick",
    dry_run: bool = False,
    ignore_cache: bool = False,
    reset_cache: bool = False,
):
    """
    Main discovery function.
    
    Args:
        query: Search query / focus area
        user_profile_id: Optional user ID for personalized discovery
        profile: Discovery profile - 'quick' (on-demand) or 'daily' (batch)
    """
    # Get discovery profile settings
    discovery_profile = get_discovery_profile(profile)
    emit_event("layer_start", {
        "layer": "query_generation", 
        "message": f"Analyzing: '{query}'",
        "profile": discovery_profile.name
    })
    
    # Get database URL
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")
    
    if not db_url and not dry_run:
        emit_event("error", {"message": "DATABASE_URL not found"})
        return
    
    # Fetch user profile if ID provided
    user_profile = None
    if user_profile_id and db_url:
        emit_event("plan", {"message": "Fetching user profile for personalized discovery..."})
        user_profile = await fetch_user_profile(user_profile_id, db_url)
        if user_profile:
            name = user_profile.get("name", "user")
            emit_event("plan", {"message": f"Personalizing search for {name}"})
        else:
            emit_event("plan", {"message": "User profile not found, using global discovery"})
    
    # Get settings (defaults to Google Gemini)
    settings = get_settings()
    
    # Log profile settings
    sys.stderr.write(f"[Discovery] Using profile: {discovery_profile.name} - {discovery_profile.description}\n")
    sys.stderr.write(f"[Discovery] Max queries: {discovery_profile.max_queries}, Semantic threshold: {discovery_profile.semantic_threshold}\n")

    # Initialize components
    search_client = get_searxng_client()
    query_generator = get_query_generator()
    crawler = get_hybrid_crawler()
    extractor = get_extractor()
    url_cache = get_url_cache()
    sync = None
    if not dry_run:
        sync = PostgresSync(db_url)
        await sync.connect()

    # Initialize embeddings and vector DB (only if enabled - uses Google Gemini embeddings)
    embeddings = None
    vector_db = None
    if settings.use_embeddings and not dry_run:
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
            # Use profile setting for max queries
            search_queries = await query_generator.generate_queries(query, count=discovery_profile.max_queries)
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
    
    query_category = detect_query_category(search_queries, query)

    # Emit layer complete for query generation
    emit_event("layer_complete", {
        "layer": "query_generation",
        "stats": {"count": len(search_queries)},
        "items": search_queries
    })
    emit_event("query_report", {
        "category": query_category,
        "queries": search_queries,
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
            canonical_url = normalize_url(result.url)
            if canonical_url not in seen_urls:
                seen_urls.add(canonical_url)
                all_results.append((canonical_url, result.title or "", result.snippet or ""))
                emit_event("found", {"url": canonical_url, "source": result.title or "Web Result"})
    
    emit_event("layer_complete", {
        "layer": "web_search",
        "stats": {"total": len(all_results), "queries": len(search_queries)}
    })
    
    # SEMANTIC FILTERING - Use embeddings to filter relevant results (FAST)
    # This happens BEFORE crawling to save time
    emit_event("layer_start", {"layer": "semantic_filter", "message": "Applying AI relevance filter..."})
    
    semantic_scored_urls = []
    semantic_filter = get_semantic_filter()
    try:
        emit_event("reasoning", {"layer": "semantic_filter", "thought": "Computing embeddings for relevance scoring..."})
        
        # Filter using embeddings with profile threshold (one batch API call for ALL results)
        semantic_scored_urls = await semantic_filter.filter_results(
            all_results, 
            max_results=discovery_profile.max_crawl_urls,
            threshold_override=discovery_profile.semantic_threshold,
            category=query_category,
        )
        
        emit_event("layer_complete", {
            "layer": "semantic_filter",
            "stats": {
                "input": len(all_results),
                "output": len(semantic_scored_urls),
                "threshold": discovery_profile.semantic_threshold,
                "category": query_category,
                "prefilter_skipped": semantic_filter.last_prefilter_skipped,
            }
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
    
    # Optionally reset cache entries for this batch
    if reset_cache:
        deleted_count = url_cache.delete_urls(filtered_urls)
        emit_event("cache_reset", {"count": deleted_count})

    # Filter out already-seen URLs using cache (check within last 7 days)
    unseen_urls = filtered_urls if ignore_cache else url_cache.filter_unseen(filtered_urls, within_days=7)
    cache_skipped = len(filtered_urls) - len(unseen_urls)
    
    # Use profile settings for max URLs (personalized gets slightly fewer)
    max_urls = min(discovery_profile.max_crawl_urls, 25 if user_profile else discovery_profile.max_crawl_urls)
    urls_to_process = unseen_urls[:max_urls]
    
    # Start parallel crawl layer
    emit_event("layer_start", {"layer": "parallel_crawl", "message": f"Crawling {len(urls_to_process)} URLs..."})
    
    # Emit analyzing events for all URLs
    for url in urls_to_process:
        emit_event("analyzing", {"url": url})
    
    # Use profile settings for concurrency
    max_concurrent = discovery_profile.max_concurrent_crawls
    
    # Emit parallel status
    emit_event("parallel_status", {
        "layer": "parallel_crawl",
        "active": min(max_concurrent, len(urls_to_process)),
        "completed": 0,
        "failed": 0,
        "pending": max(0, len(urls_to_process) - max_concurrent)
    })
    
    # Process URLs in PARALLEL using crawl_batch for crawling
    crawl_results = await crawler.crawl_batch(urls_to_process, max_concurrent=max_concurrent)
    
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
    rejection_counts = Counter()
    rejection_lock = asyncio.Lock()
    dedupe_lock = asyncio.Lock()
    seen_title_org = set()

    async def log_rejection(
        reason: str,
        url: str,
        title: Optional[str] = None,
        content_type: Optional[str] = None,
        confidence: Optional[float] = None,
        error: Optional[str] = None,
    ) -> None:
        async with rejection_lock:
            rejection_counts[reason] += 1
        emit_event("rejected", {
            "url": url,
            "reason": reason,
            "title": title,
            "content_type": content_type,
            "confidence": confidence,
            "error": error,
        })
    
    async def extract_and_save(crawl_result) -> dict | None:
        if not crawl_result.success:
            url_cache.mark_seen(crawl_result.url, "failed", expires_days=7, notes=crawl_result.error)
            await log_rejection("crawl_failed", crawl_result.url, error=crawl_result.error)
            return {"error": f"Crawl failed: {crawl_result.error}", "url": crawl_result.url}
        
        content_len = len(crawl_result.markdown or '')
        if content_len < 100:
            url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Content too short")
            await log_rejection("content_too_short", crawl_result.url)
            return {"error": f"Content too short: {content_len} chars", "url": crawl_result.url}
        
        async with extraction_semaphore:
            try:
                extraction = await extractor.extract(crawl_result.markdown, crawl_result.url)
                if not extraction.success:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=extraction.error)
                    await log_rejection("extraction_failed", crawl_result.url, error=extraction.error)
                    return {"error": f"Extraction failed: {extraction.error}", "url": crawl_result.url}
                
                opp = extraction.opportunity_card
                if not opp:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="No card extracted")
                    await log_rejection("no_card", crawl_result.url)
                    return {"error": "No card extracted", "url": crawl_result.url}
                
                # Skip guide/article content types
                if opp.content_type != ContentType.OPPORTUNITY:
                    url_cache.mark_seen(
                        crawl_result.url,
                        "blocked",
                        expires_days=90,
                        notes=f"Content type: {opp.content_type.value}",
                    )
                    await log_rejection(
                        "content_type",
                        crawl_result.url,
                        title=opp.title,
                        content_type=opp.content_type.value,
                        confidence=extraction.confidence,
                    )
                    return {"error": f"Non-opportunity content: {opp.content_type.value}", "url": crawl_result.url}

                # Skip low-confidence extractions
                confidence = extraction.confidence or 0.0
                if confidence < 0.4:
                    url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30, notes=f"Confidence: {confidence:.2f}")
                    await log_rejection(
                        "low_confidence",
                        crawl_result.url,
                        title=opp.title,
                        content_type=opp.content_type.value,
                        confidence=confidence,
                    )
                    return {"error": f"Low confidence: {confidence:.2f}", "url": crawl_result.url}
                
                # Skip generic/invalid extractions
                if opp.title == "Unknown Opportunity" or opp.organization in ["Unknown", None, ""]:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Generic extraction")
                    await log_rejection(
                        "generic_extraction",
                        crawl_result.url,
                        title=opp.title,
                        content_type=opp.content_type.value,
                        confidence=confidence,
                    )
                    return {"error": "Generic extraction", "url": crawl_result.url}
                
                # Skip ranking/list articles (common noise)
                title_lower = opp.title.lower()
                guide_signals = [
                    'best ', 'top ', 'ranking', 'list of',
                    'ultimate guide', 'guide to', 'how to', 'tips for', 'tips to',
                ]
                if any(skip in title_lower for skip in guide_signals):
                    url_cache.mark_seen(crawl_result.url, "blocked", expires_days=90, notes="Ranking article")
                    await log_rejection(
                        "guide_title",
                        crawl_result.url,
                        title=opp.title,
                        content_type=opp.content_type.value,
                        confidence=confidence,
                    )
                    return {"error": f"Ranking article: {opp.title}", "url": crawl_result.url}
                
                # Time-based filtering
                if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                    url_cache.mark_seen(crawl_result.url, "expired", expires_days=365, notes="Expired one-time")
                    await log_rejection(
                        "expired_one_time",
                        crawl_result.url,
                        title=opp.title,
                        content_type=opp.content_type.value,
                        confidence=confidence,
                    )
                    return {"error": f"Expired one-time opportunity", "url": crawl_result.url}
                
                # For expired recurring/annual opportunities, set priority recheck
                if opp.is_expired and opp.timing_type in [OpportunityTiming.ANNUAL, OpportunityTiming.RECURRING, OpportunityTiming.SEASONAL]:
                    opp.recheck_days = 3

                # Deduplicate within this run by normalized title + organization
                title_key = normalize_text(opp.title or "")
                org_key = normalize_text(opp.organization or "")
                dedupe_key = f"{title_key}|{org_key}"
                async with dedupe_lock:
                    if dedupe_key in seen_title_org:
                        url_cache.mark_seen(crawl_result.url, "duplicate", expires_days=30, notes="Duplicate title/org")
                        await log_rejection(
                            "duplicate_title_org",
                            crawl_result.url,
                            title=opp.title,
                            content_type=opp.content_type.value,
                            confidence=confidence,
                        )
                        return {"error": "Duplicate title/org", "url": crawl_result.url}
                    seen_title_org.add(dedupe_key)
                
                # Sync to database (contributes to overall database)
                if sync:
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
                await log_rejection("exception", crawl_result.url, error=str(e)[:200])
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

    emit_event("rejection_summary", {
        "reasons": dict(rejection_counts),
    })
    emit_event("filter_report", {
        "query_category": query_category,
        "query_count": len(search_queries),
        "search_results": len(all_results),
        "semantic_prefilter_skipped": semantic_filter.last_prefilter_skipped,
        "semantic_kept": len(semantic_scored_urls),
        "cache_skipped": cache_skipped,
        "urls_crawled": len(urls_to_process),
        "rejections": dict(rejection_counts),
    })
    
    # DB sync layer (already done inline, just emit completion)
    if sync:
        emit_event("layer_start", {"layer": "db_sync", "message": f"Syncing {success_count} opportunities..."})
        emit_event("layer_complete", {
            "layer": "db_sync",
            "stats": {"inserted": success_count, "updated": 0, "skipped": failed_count}
        })
    
    emit_event("complete", {
        "count": success_count,
        "isPersonalized": user_profile is not None,
        "user_id": user_profile.get("user_id") if user_profile else None,
    })
    if sync:
        await sync.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Quick opportunity discovery with optional personalization")
    parser.add_argument("query", help="Search query / focus area")
    parser.add_argument("--user-profile-id", help="User ID for personalized discovery", default=None)
    parser.add_argument(
        "--profile",
        choices=["quick", "daily"],
        default="quick",
        help="Discovery profile: 'quick' for on-demand (stricter), 'daily' for batch (broader)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run discovery without writing to Supabase or vector DB"
    )
    parser.add_argument(
        "--ignore-cache",
        action="store_true",
        help="Skip URL cache filtering for this run"
    )
    parser.add_argument(
        "--reset-cache",
        action="store_true",
        help="Delete cache entries for URLs in this run"
    )
    
    args = parser.parse_args()
    
    try:
        asyncio.run(
            main(
                args.query,
                args.user_profile_id,
                args.profile,
                args.dry_run,
                args.ignore_cache,
                args.reset_cache,
            )
        )
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.exit(1)
