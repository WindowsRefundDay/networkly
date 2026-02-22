"""On-demand personalized discovery with DEBUG MODE.

THIS IS A DEBUG VERSION - ADDS COMPREHENSIVE LOGGING
"""

import asyncio
import sys
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, List
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.search.searxng_client import get_searxng_client
from src.search.semantic_filter import get_semantic_filter
from src.agents.extractor import get_extractor
from src.agents.query_generator import get_query_generator
from src.agents.discovery import get_discovery_agent
from src.crawlers.hybrid_crawler import get_hybrid_crawler
from src.api.postgres_sync import PostgresSync
from src.config import get_settings
from src.embeddings import get_embeddings
from src.db.vector_db import get_vector_db
from src.db.url_cache import get_url_cache
from src.db.models import OpportunityTiming


PERSONALIZED_PROFILER_PROMPT = """You are an expert career advisor for high school students.

STUDENT PROFILE:
- Name: {name}
- Interests: {interests}
- Location: {location}
- Grade Level: {grade_level}
- Career Goals: {career_goals}
- Preferred Opportunity Types: {preferred_types}
- Academic Strengths: {strengths}
- Availability: {availability}
- Skills: {skills}

SEARCH CONTEXT:
The user searched for: "{search_query}"
They found NO relevant opportunities and need personalized help.

GENERATE 20-25 HYPER-TARGETED search queries that:
1. Combine their interests + location + grade level
2. Prioritize their preferred opportunity types
3. Account for their availability (summer, academic year, flexible)
4. Leverage their academic strengths
5. Align with career goals
6. Include 2026 deadlines/years

QUERY FORMATS:
- Specific: "AI research internship California 11th grade 2026"
- Location-based: "AI program San Francisco high school"
- Type-focused: "research internship for AI students"
- Strength-matched: "computer science competition high school California"
- Career-aligned: "software engineering opportunity for students"

Return ONLY a JSON array of queries:
["query 1", "query 2", ...]
"""


def log_debug(message: str, level: str = "INFO"):
    """Debug logging to stderr."""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    color_codes = {
        "INFO": "\033[36m",  # Cyan
        "SUCCESS": "\033[32m",  # Green
        "WARNING": "\033[33m",  # Yellow
        "ERROR": "\033[31m",  # Red
        "DEBUG": "\033[35m",  # Magenta
    }
    reset = "\033[0m"
    color = color_codes.get(level, "")
    sys.stderr.write(f"{color}[{timestamp}] [{level}] {message}{reset}\n")
    sys.stderr.flush()


def emit_event(type: str, data: dict):
    """Emit JSON event to stdout for streaming."""
    event = {"type": type, **data}
    print(json.dumps(event), flush=True)
    sys.stdout.flush()


async def fetch_user_profile(user_id: str, db_url: str) -> Optional[Dict[str, Any]]:
    """Fetch complete user profile from PostgreSQL."""
    import asyncpg
    import ssl
    
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE
    
    try:
        log_debug(f"Connecting to database for user {user_id}...")
        conn = await asyncpg.connect(db_url, ssl=ssl_context)
        
        profile_row = await conn.fetchrow('''
            SELECT 
                u.name,
                u."skills",
                u."interests",
                u.location,
                u."graduationYear",
                up.grade_level,
                up.career_goals,
                up.preferred_opportunity_types,
                up.academic_strengths,
                up.availability,
                up.school
            FROM "User" u
            LEFT JOIN "UserProfile" up ON u.id = up."userId"
            WHERE u.id = $1
        ''', user_id)
        
        await conn.close()
        
        if not profile_row:
            log_debug(f"No profile found for user {user_id}", "ERROR")
            return None
        
        profile = {
            "user_id": user_id,
            "name": profile_row["name"] or "",
            "interests": profile_row["interests"] or [],
            "location": profile_row["location"] or "Any",
            "grade_level": profile_row["grade_level"] or 11,
            "career_goals": profile_row["career_goals"],
            "preferred_types": profile_row["preferred_opportunity_types"] or [],
            "strengths": profile_row["academic_strengths"] or [],
            "skills": profile_row["skills"] or [],
            "availability": profile_row["availability"] or "Flexible",
        }
        
        log_debug(f"Profile loaded: {profile['name']}, Interests: {profile['interests']}, Location: {profile['location']}", "SUCCESS")
        return profile
        
    except Exception as e:
        log_debug(f"Profile fetch error: {e}", "ERROR")
        return None


async def generate_personalized_queries(
    user_profile: Dict[str, Any],
    search_query: str
) -> List[str]:
    """Generate hyper-targeted queries based on user profile."""
    
    from src.llm import get_llm_provider, GenerationConfig
    
    provider = get_llm_provider()
    
    prompt = PERSONALIZED_PROFILER_PROMPT.format(
        name=user_profile.get("name", ""),
        interests=", ".join(user_profile.get("interests", []) or ["Any"]),
        location=user_profile.get("location", "Any"),
        grade_level=user_profile.get("grade_level", 11),
        career_goals=user_profile.get("career_goals") or "Not specified",
        preferred_types=", ".join(user_profile.get("preferred_types", []) or ["Any"]),
        strengths=", ".join(user_profile.get("strengths", []) or ["Not specified"]),
        skills=", ".join(user_profile.get("skills", []) or ["Not specified"]),
        availability=user_profile.get("availability", "Flexible"),
        search_query=search_query,
    )
    
    config = GenerationConfig(
        temperature=0.8,
        max_output_tokens=800,
        use_fast_model=True,
    )
    
    try:
        log_debug("Generating personalized queries with AI...")
        response = await provider.generate(prompt, config)
        
        # Clean JSON response
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        queries = json.loads(response_text)
        
        if not isinstance(queries, list) or len(queries) < 15:
            log_debug(f"AI returned insufficient queries ({len(queries) if isinstance(queries, list) else 0}), using fallback", "WARNING")
            from scripts.personalized_discovery import generate_fallback_queries
            queries = generate_fallback_queries(user_profile, search_query)
        
        log_debug(f"Generated {len(queries)} personalized queries", "SUCCESS")
        log_debug(f"Sample queries: {queries[:3]}", "DEBUG")
        
        emit_event("queries_generated", {
            "count": len(queries),
            "sample": queries[:3]
        })
        
        return queries
        
    except Exception as e:
        log_debug(f"Query generation error: {e}", "ERROR")
        from scripts.personalized_discovery import generate_fallback_queries
        return generate_fallback_queries(user_profile, search_query)


async def main(user_id: str, search_query: str):
    """Main personalized discovery with debug logging."""
    
    log_debug("=" * 80, "INFO")
    log_debug("PERSONALIZED DISCOVERY - DEBUG MODE", "INFO")
    log_debug("=" * 80, "INFO")
    
    emit_event("layer_start", {
        "layer": "profile_fetch",
        "message": f"Fetching profile for user {user_id}..."
    })
    
    # Step 1: Fetch user profile
    db_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
    if not db_url:
        log_debug("DATABASE_URL not configured", "ERROR")
        emit_event("error", {"message": "DATABASE_URL not configured"})
        return
    
    user_profile = await fetch_user_profile(user_id, db_url)
    if not user_profile:
        log_debug(f"User profile not found: {user_id}", "ERROR")
        emit_event("error", {"message": f"User profile not found: {user_id}"})
        return
    
    emit_event("layer_complete", {
        "layer": "profile_fetch",
        "profile": {
            "name": user_profile["name"],
            "interests": user_profile["interests"],
            "location": user_profile["location"],
            "grade_level": user_profile["grade_level"],
        }
    })
    
    # Step 2: Generate personalized queries
    emit_event("layer_start", {
        "layer": "query_generation",
        "message": "Generating 20-25 personalized search queries..."
    })
    
    search_queries = await generate_personalized_queries(user_profile, search_query)
    
    emit_event("layer_complete", {
        "layer": "query_generation",
        "stats": {"count": len(search_queries)},
        "items": search_queries
    })
    
    # Step 3: Execute broad search
    emit_event("layer_start", {
        "layer": "web_search",
        "message": f"Searching with {len(search_queries)} personalized queries..."
    })
    
    log_debug(f"Starting web search with {len(search_queries)} queries...", "INFO")
    search_client = get_searxng_client()
    all_results = []
    seen_urls = set()
    
    async def do_search(query: str):
        try:
            results = await search_client.search(query, max_results=15)
            unique_results = [
                (r.url, r.title or "", r.snippet or "") 
                for r in results 
                if r.url not in seen_urls
            ]
            seen_urls.update([r.url for r in results])
            log_debug(f"Query '{query[:50]}...' returned {len(unique_results)} unique URLs", "DEBUG")
            return unique_results
        except Exception as e:
            log_debug(f"Search error for '{query}': {e}", "ERROR")
            return []
    
    search_tasks = [do_search(q) for q in search_queries]
    search_results = await asyncio.gather(*search_tasks)
    
    for results in search_results:
        all_results.extend(results)
    
    log_debug(f"Web search complete: {len(all_results)} total URLs", "SUCCESS")
    
    emit_event("layer_complete", {
        "layer": "web_search",
        "stats": {"total": len(all_results), "queries": len(search_queries)}
    })
    
    # Step 4: Semantic filtering
    emit_event("layer_start", {
        "layer": "semantic_filter",
        "message": "Applying quality filter with higher threshold..."
    })
    
    log_debug("Starting semantic filtering...", "INFO")
    semantic_filter = get_semantic_filter()
    
    try:
        scored_urls = await semantic_filter.filter_results(all_results, max_results=200)
        
        log_debug(f"Semantic filter complete: {len(scored_urls)} URLs passed", "SUCCESS")
        log_debug(f"Top scores: {[f'{score:.2f}' for _, score in scored_urls[:5]]}", "DEBUG")
        
        emit_event("layer_complete", {
            "layer": "semantic_filter",
            "stats": {
                "input": len(all_results),
                "output": len(scored_urls),
                "threshold": 0.60
            }
        })
        
        # Log top results
        for url, score in scored_urls[:5]:
            log_debug(f"  [{score:.2f}] {url[:70]}...", "DEBUG")
        
    except Exception as e:
        log_debug(f"Semantic filter error: {e}", "ERROR")
        scored_urls = [(url, 0.5) for url, _, _ in all_results]
    
    filtered_urls = [url for url, score in scored_urls]
    
    # Filter unseen URLs
    url_cache = get_url_cache()
    unseen_urls = url_cache.filter_unseen(filtered_urls, within_days=3)
    log_debug(f"URL cache filtered: {len(unseen_urls)} unseen URLs (3-day window)", "INFO")
    
    # Step 5: Fast crawling
    emit_event("layer_start", {
        "layer": "parallel_crawl",
        "message": f"Crawling {len(unseen_urls)} URLs with hybrid crawler..."
    })
    
    log_debug(f"Starting hybrid crawler with {len(unseen_urls)} URLs (max_concurrent=75)...", "INFO")
    
    # Emit analyzing events for UI
    for url in unseen_urls[:50]:
        emit_event("analyzing", {"url": url})
    
    emit_event("parallel_status", {
        "active": min(75, len(unseen_urls)),
        "completed": 0,
        "pending": max(0, len(unseen_urls) - 75)
    })
    
    crawler = get_hybrid_crawler()
    crawl_results = await crawler.crawl_batch(unseen_urls, max_concurrent=75)
    
    crawl_success = sum(1 for r in crawl_results if r.success)
    crawl_failed = len(crawl_results) - crawl_success
    
    # Count crawler usage
    scrapy_count = sum(1 for r in crawl_results if r.success and r.crawler_used == "scrapy")
    crawl4ai_count = sum(1 for r in crawl_results if r.success and r.crawler_used == "crawl4ai")
    
    log_debug(f"Crawling complete: {crawl_success} success, {crawl_failed} failed", "SUCCESS")
    log_debug(f"Crawler usage: Scrapy={scrapy_count}, Crawl4AI={crawl4ai_count}", "DEBUG")
    
    emit_event("layer_complete", {
        "layer": "parallel_crawl",
        "stats": {"total": len(unseen_urls), "completed": crawl_success, "failed": crawl_failed}
    })
    
    # Step 6: Gemini extraction
    emit_event("layer_start", {
        "layer": "ai_extraction",
        "message": f"Extracting from {crawl_success} pages with date awareness..."
    })
    
    log_debug(f"Starting AI extraction on {crawl_success} pages...", "INFO")
    
    extractor = get_extractor()
    url_cache = get_url_cache()
    sync = PostgresSync(db_url)
    await sync.connect()
    
    embeddings = None
    vector_db = None
    settings = get_settings()
    if settings.use_embeddings:
        try:
            embeddings = get_embeddings()
            vector_db = get_vector_db()
        except Exception as e:
            log_debug(f"Embeddings initialization error: {e}", "WARNING")
    
    extraction_semaphore = asyncio.Semaphore(10)
    success_count = 0
    opportunities_details = []
    
    async def extract_and_save(crawl_result) -> dict:
        nonlocal success_count
        
        if not crawl_result.success:
            url_cache.mark_seen(crawl_result.url, "failed", expires_days=7, notes=crawl_result.error)
            return {"error": f"Crawl failed: {crawl_result.error}", "url": crawl_result.url}
        
        content_len = len(crawl_result.markdown or '')
        if content_len < 100:
            url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Content too short")
            return {"error": f"Content too short: {content_len}", "url": crawl_result.url}
        
        async with extraction_semaphore:
            try:
                extraction = await extractor.extract(crawl_result.markdown, crawl_result.url)
                
                if not extraction.success:
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=extraction.error)
                    log_debug(f"Extraction failed for {crawl_result.url[:50]}: {extraction.error}", "WARNING")
                    return {"error": f"Extraction failed: {extraction.error}", "url": crawl_result.url}
                
                opp = extraction.opportunity_card
                if not opp:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="No card extracted")
                    return {"error": "No card extracted", "url": crawl_result.url}
                
                # Skip low confidence
                confidence = extraction.confidence or 0.0
                if confidence < 0.4:
                    url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30, notes=f"Confidence: {confidence:.2f}")
                    log_debug(f"Low confidence ({confidence:.2f}): {opp.title[:50]}", "WARNING")
                    return {"error": f"Low confidence: {confidence:.2f}", "url": crawl_result.url}
                
                # Skip generic extractions
                if opp.title == "Unknown Opportunity" or opp.organization in ["Unknown", None, ""]:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="Generic extraction")
                    return {"error": "Generic extraction", "url": crawl_result.url}
                
                # Skip ranking/list articles
                title_lower = opp.title.lower()
                if any(skip in title_lower for skip in ['best ', 'top ', 'ranking', 'list of']):
                    url_cache.mark_seen(crawl_result.url, "blocked", expires_days=90, notes="Ranking article")
                    return {"error": f"Ranking article: {opp.title}", "url": crawl_result.url}
                
                # DEBUG: Log extracted opportunity details
                log_debug("=" * 60, "DEBUG")
                log_debug(f"EXTRACTED OPPORTUNITY #{success_count + 1}", "SUCCESS")
                log_debug(f"  Title: {opp.title}", "DEBUG")
                log_debug(f"  Organization: {opp.organization}", "DEBUG")
                log_debug(f"  Category: {opp.category.value}", "DEBUG")
                log_debug(f"  Type: {opp.opportunity_type.value}", "DEBUG")
                log_debug(f"  Timing: {opp.timing_type.value}", "DEBUG")
                log_debug(f"  Deadline: {opp.deadline.strftime('%Y-%m-%d') if opp.deadline else 'None'}", "DEBUG")
                log_debug(f"  Start Date: {opp.start_date.strftime('%Y-%m-%d') if opp.start_date else 'None'}", "DEBUG")
                log_debug(f"  End Date: {opp.end_date.strftime('%Y-%m-%d') if opp.end_date else 'None'}", "DEBUG")
                log_debug(f"  Is Expired: {opp.is_expired}", "DEBUG")
                log_debug(f"  Next Cycle: {opp.next_cycle_expected.strftime('%Y-%m-%d') if opp.next_cycle_expected else 'None'}", "DEBUG")
                log_debug(f"  Location Type: {opp.location_type.value}", "DEBUG")
                log_debug(f"  Location: {opp.location or 'N/A'}", "DEBUG")
                log_debug(f"  Grade Levels: {opp.grade_levels}", "DEBUG")
                log_debug(f"  Cost: {opp.cost or 'N/A'}", "DEBUG")
                log_debug(f"  Time Commitment: {opp.time_commitment or 'N/A'}", "DEBUG")
                log_debug(f"  Requirements: {(opp.requirements or 'N/A')[:100]}...", "DEBUG")
                log_debug(f"  Prizes: {opp.prizes or 'N/A'}", "DEBUG")
                log_debug(f"  Tags: {', '.join(opp.tags) if opp.tags else 'None'}", "DEBUG")
                log_debug(f"  Confidence: {confidence:.2f}", "DEBUG")
                log_debug(f"  Recheck Days: {opp.recheck_days}", "DEBUG")
                log_debug(f"  URL: {opp.url[:70]}...", "DEBUG")
                log_debug(f"  Summary: {opp.summary[:150]}...", "DEBUG")
                log_debug("=" * 60, "DEBUG")
                
                # Date validation
                has_valid_dates = bool(opp.deadline or opp.start_date)
                if not has_valid_dates:
                    log_debug(f"  ⚠️ No dates detected for: {opp.title[:50]}", "WARNING")
                    opp.recheck_days = 7
                
                # Time-based filtering
                if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                    from datetime import timedelta
                    if opp.deadline:
                        grace_cutoff = datetime.utcnow() - timedelta(days=30)
                        if opp.deadline < grace_cutoff:
                            url_cache.mark_seen(crawl_result.url, "expired", expires_days=365, notes="Expired one-time beyond grace")
                            log_debug(f"  ❌ Expired one-time opportunity (beyond grace period)", "WARNING")
                            return {"error": f"Expired one-time opportunity", "url": crawl_result.url}
                
                # For expired recurring/annual, set short recheck
                if opp.is_expired and opp.timing_type in [
                    OpportunityTiming.ANNUAL,
                    OpportunityTiming.RECURRING,
                    OpportunityTiming.SEASONAL
                ]:
                    opp.recheck_days = 3
                    log_debug(f"  🔄 Expired {opp.timing_type.value} opportunity, recheck in 3 days", "INFO")
                
                # Sync to database
                try:
                    opp_id = await sync.upsert_opportunity(opp)
                    
                    # Link to user's profile (method not implemented in PostgresSync yet)
                    # await sync.link_opportunity_to_user(
                    #     opp_id=opp_id,
                    #     user_id=user_profile["user_id"],
                    #     source="personalized_discovery",
                    #     curated=True
                    # )
                    
                    # Mark as seen
                    url_cache.mark_seen(
                        crawl_result.url,
                        "success",
                        expires_days=opp.recheck_days,
                        notes=opp.title
                    )
                    
                    success_count += 1
                    
                    # Store for final summary
                    opportunities_details.append({
                        "title": opp.title,
                        "organization": opp.organization,
                        "type": opp.opportunity_type.value,
                        "category": opp.category.value,
                        "timing": opp.timing_type.value,
                        "deadline": opp.deadline.strftime("%Y-%m-%d") if opp.deadline else None,
                        "is_expired": opp.is_expired,
                        "has_dates": has_valid_dates,
                        "confidence": confidence,
                        "url": opp.url,
                    })
                    
                    log_debug(f"  ✅ Saved to database (ID: {opp_id})", "SUCCESS")
                    
                    # Emit opportunity found event (camelCase for frontend compatibility)
                    emit_event("opportunity_found", {
                        "id": opp.id,
                        "title": opp.title,
                        "organization": opp.organization,
                        "category": opp.category.value,
                        "opportunityType": opp.opportunity_type.value,
                        "url": opp.url,
                        "deadline": opp.deadline.isoformat() if opp.deadline else None,
                        "start_date": opp.start_date.isoformat() if opp.start_date else None,
                        "end_date": opp.end_date.isoformat() if opp.end_date else None,
                        "timing_type": opp.timing_type.value,
                        "is_expired": opp.is_expired,
                        "next_cycle_expected": opp.next_cycle_expected.isoformat() if opp.next_cycle_expected else None,
                        "summary": opp.summary[:150] + "..." if len(opp.summary) > 150 else opp.summary,
                        "locationType": opp.location_type.value,
                        "confidence": confidence,
                        "is_personalized": True,
                        "user_id": user_profile["user_id"],
                    })
                    
                    # Add to vector DB
                    if embeddings and vector_db and settings.use_embeddings:
                        try:
                            emb_vector = embeddings.generate_for_indexing(opp.to_embedding_text())
                            vector_db.add_opportunity_with_embedding(opp, emb_vector)
                        except Exception:
                            pass
                    
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
                    
                except Exception as save_err:
                    log_debug(f"Save error: {save_err}", "ERROR")
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=str(save_err)[:100])
                    return {"error": f"Save failed: {save_err}", "url": crawl_result.url}
                    
            except Exception as e:
                log_debug(f"Extraction error for {crawl_result.url[:50]}: {str(e)[:100]}", "ERROR")
                return {"error": str(e)[:100], "url": crawl_result.url}
    
    # Run all extractions in parallel
    log_debug("Running parallel extractions...", "INFO")
    extraction_tasks = [extract_and_save(cr) for cr in crawl_results]
    extraction_results = await asyncio.gather(*extraction_tasks)
    
    # Count results
    failed_count = sum(1 for result in extraction_results if result.get("error"))
    
    log_debug(f"Extraction complete: {success_count} successful, {failed_count} failed", "SUCCESS")
    
    emit_event("layer_complete", {
        "layer": "ai_extraction",
        "stats": {"total": len(crawl_results), "completed": success_count, "failed": failed_count}
    })
    
    emit_event("layer_start", {
        "layer": "db_sync",
        "message": f"Syncing {success_count} opportunities for user {user_id}..."
    })
    
    emit_event("layer_complete", {
        "layer": "db_sync",
        "stats": {"inserted": success_count, "updated": 0, "skipped": failed_count}
    })
    
    # Final debug summary
    log_debug("=" * 80, "INFO")
    log_debug("FINAL SUMMARY", "SUCCESS")
    log_debug("=" * 80, "INFO")
    log_debug(f"Total opportunities found: {success_count}", "SUCCESS")
    
    # Group by category
    by_category = {}
    by_type = {}
    by_timing = {}
    with_dates = 0
    without_dates = 0
    expired = 0
    
    for opp_detail in opportunities_details:
        cat = opp_detail["category"]
        typ = opp_detail["type"]
        timing = opp_detail["timing"]
        
        by_category[cat] = by_category.get(cat, 0) + 1
        by_type[typ] = by_type.get(typ, 0) + 1
        by_timing[timing] = by_timing.get(timing, 0) + 1
        
        if opp_detail["has_dates"]:
            with_dates += 1
        else:
            without_dates += 1
        
        if opp_detail["is_expired"]:
            expired += 1
    
    log_debug(f"By Category: {dict(sorted(by_category.items(), key=lambda x: x[1], reverse=True))}", "INFO")
    log_debug(f"By Type: {dict(sorted(by_type.items(), key=lambda x: x[1], reverse=True))}", "INFO")
    log_debug(f"By Timing: {dict(sorted(by_timing.items(), key=lambda x: x[1], reverse=True))}", "INFO")
    log_debug(f"With Dates: {with_dates} ({with_dates/success_count*100:.1f}%)", "INFO" if with_dates > success_count * 0.7 else "WARNING")
    log_debug(f"Without Dates: {without_dates} ({without_dates/success_count*100:.1f}%)", "WARNING" if without_dates > success_count * 0.3 else "INFO")
    log_debug(f"Expired: {expired} ({expired/success_count*100:.1f}%)", "INFO")
    
    log_debug("\nSample Opportunities:", "INFO")
    for i, opp in enumerate(opportunities_details[:5], 1):
        log_debug(f"{i}. {opp['title'][:50]} ({opp['type']}, {opp['timing']})", "INFO")
        log_debug(f"   Deadline: {opp['deadline'] or 'N/A'}, Conf: {opp['confidence']:.2f}", "INFO")
    
    log_debug("=" * 80, "INFO")
    
    # Final completion event
    emit_event("complete", {
        "count": success_count,
        "is_personalized": True,
        "user_id": user_profile["user_id"],
        "stats": {
            "queries_generated": len(search_queries),
            "search_results": len(all_results),
            "filtered_urls": len(filtered_urls),
            "crawled": crawl_success,
            "extracted": success_count,
        }
    })
    
    await sync.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="On-demand personalized discovery (DEBUG MODE)")
    parser.add_argument("user_id", help="User ID for personalized discovery")
    parser.add_argument("search_query", help="Original search query that failed")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.user_id, args.search_query))
    except Exception as e:
        log_debug(f"Fatal error: {e}", "ERROR")
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.exit(1)
