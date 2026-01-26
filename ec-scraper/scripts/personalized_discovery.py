"""On-demand personalized discovery triggered by user searches.

Triggered when user finds no relevant opportunities.
Uses full profile context for deep, personalized search.
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
- Location-based: "{interest} program {location} high school"
- Type-focused: "{opportunity_type} for {interest} teens"
- Strength-matched: "{strength} competition high school {location}"
- Career-aligned: "{career_goal} opportunity for students"

Return ONLY a JSON array of queries:
["query 1", "query 2", ...]
"""


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
        conn = await asyncpg.connect(db_url, ssl=ssl_context)
        
        profile_row = await conn.fetchrow('''
            SELECT 
                u.name,
                u."skills",
                u."interests",
                u.location,
                u.graduation_year,
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
            return None
        
        return {
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
        
    except Exception as e:
        sys.stderr.write(f"[Profile] Error fetching: {e}\n")
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
        temperature=0.8,  # Higher creativity for diverse queries
        max_output_tokens=800,
        use_fast_model=True,  # Use gemini-2.5-flash-lite
    )
    
    try:
        response = await provider.generate(prompt, config)
        
        # Clean JSON response
        response_text = response.strip()
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])
        
        queries = json.loads(response_text)
        
        if not isinstance(queries, list) or len(queries) < 15:
            # Fallback: Generate template-based queries
            queries = generate_fallback_queries(user_profile, search_query)
        
        emit_event("queries_generated", {
            "count": len(queries),
            "sample": queries[:3]
        })
        
        return queries
        
    except Exception as e:
        sys.stderr.write(f"[Queries] Error: {e}\n")
        return generate_fallback_queries(user_profile, search_query)


def generate_fallback_queries(
    user_profile: Dict[str, Any],
    search_query: str
) -> List[str]:
    """Generate template-based queries if AI fails."""
    
    interests = user_profile.get("interests", ["opportunities"])[:3]
    location = user_profile.get("location", "")
    preferred_types = user_profile.get("preferred_types", ["internship", "program"])[:2]
    
    queries = []
    
    # Interest-based queries
    for interest in interests:
        queries.append(f"{interest} opportunities high school 2026")
        if location:
            queries.append(f"{interest} program {location}")
    
    # Type-focused queries
    for ptype in preferred_types:
        queries.append(f"{ptype} for high school students {search_query}")
        if location:
            queries.append(f"{ptype} {location} high school")
    
    # Add original search
    queries.append(f"{search_query} for high school students")
    
    return queries[:20]


async def main(user_id: str, search_query: str):
    """Main personalized discovery function."""
    
    emit_event("layer_start", {
        "layer": "profile_fetch",
        "message": f"Fetching profile for user {user_id}..."
    })
    
    # Step 1: Fetch user profile
    db_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")
    if not db_url:
        emit_event("error", {"message": "DATABASE_URL not configured"})
        return
    
    user_profile = await fetch_user_profile(user_id, db_url)
    if not user_profile:
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
            return unique_results
        except Exception as e:
            sys.stderr.write(f"[Search] Error: {e}\n")
            return []
    
    search_tasks = [do_search(q) for q in search_queries]
    search_results = await asyncio.gather(*search_tasks)
    
    for results in search_results:
        all_results.extend(results)
    
    emit_event("layer_complete", {
        "layer": "web_search",
        "stats": {"total": len(all_results), "queries": len(search_queries)}
    })
    
    # Step 4: Semantic filtering (higher threshold for personalized)
    emit_event("layer_start", {
        "layer": "semantic_filter",
        "message": "Applying quality filter with higher threshold..."
    })
    
    # Higher threshold = better quality for personalized results
    semantic_filter = get_semantic_filter(similarity_threshold=0.60)
    
    try:
        category = detect_query_category(search_queries, search_query)
        scored_urls = await semantic_filter.filter_results(
            all_results,
            max_results=200,
            category=category,
        )
        
        emit_event("layer_complete", {
            "layer": "semantic_filter",
            "stats": {
                "input": len(all_results),
                "output": len(scored_urls),
                "threshold": 0.60,
                "category": category,
            }
        })
        
        # Log top results for debugging
        for url, score in scored_urls[:5]:
            sys.stderr.write(f"  [Semantic] {score:.2f} - {url[:60]}...\n")
        
    except Exception as e:
        sys.stderr.write(f"[SemanticFilter] Error: {e}\n")
        scored_urls = [(url, 0.5) for url, _, _ in all_results]
    
    filtered_urls = [url for url, score in scored_urls]
    
    # Filter unseen URLs (shorter window - want FRESH results)
    url_cache = get_url_cache()
    unseen_urls = url_cache.filter_unseen(filtered_urls, within_days=3)  # 3 days only!
    
    # Step 5: Fast crawling (Scrapy, high concurrency)
    emit_event("layer_start", {
        "layer": "parallel_crawl",
        "message": f"Crawling {len(unseen_urls)} URLs with hybrid crawler..."
    })
    
    # Emit analyzing events for UI (limit to 50)
    for url in unseen_urls[:50]:
        emit_event("analyzing", {"url": url})
    
    emit_event("parallel_status", {
        "active": min(75, len(unseen_urls)),
        "completed": 0,
        "pending": max(0, len(unseen_urls) - 75)
    })
    
    crawler = get_hybrid_crawler()
    crawl_results = await crawler.crawl_batch(unseen_urls, max_concurrent=75)  # High!
    
    crawl_success = sum(1 for r in crawl_results if r.success)
    crawl_failed = len(crawl_results) - crawl_success
    
    emit_event("layer_complete", {
        "layer": "parallel_crawl",
        "stats": {"total": len(unseen_urls), "completed": crawl_success, "failed": crawl_failed}
    })
    
    # Step 6: Gemini extraction (date-aware)
    emit_event("layer_start", {
        "layer": "ai_extraction",
        "message": f"Extracting from {crawl_success} pages with date awareness..."
    })
    
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
            sys.stderr.write(f"[Embeddings] Error: {e}\n")
    
    extraction_semaphore = asyncio.Semaphore(10)
    success_count = 0
    
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
                    return {"error": f"Extraction failed: {extraction.error}", "url": crawl_result.url}
                
                opp = extraction.opportunity_card
                if not opp:
                    url_cache.mark_seen(crawl_result.url, "invalid", expires_days=30, notes="No card extracted")
                    return {"error": "No card extracted", "url": crawl_result.url}
                
                # Skip low confidence
                confidence = extraction.confidence or 0.0
                if confidence < 0.4:
                    url_cache.mark_seen(crawl_result.url, "low_confidence", expires_days=30, notes=f"Confidence: {confidence:.2f}")
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
                
                # Date handling - check if opportunity has valid dates
                has_valid_dates = bool(opp.deadline or opp.start_date)
                if not has_valid_dates:
                    # Still save, but mark for quick recheck
                    opp.recheck_days = 7
                
                # Time-based filtering
                if opp.is_expired and opp.timing_type == OpportunityTiming.ONE_TIME:
                    # Check if within 30-day grace period
                    from datetime import timedelta
                    if opp.deadline:
                        grace_cutoff = datetime.utcnow() - timedelta(days=30)
                        if opp.deadline < grace_cutoff:
                            url_cache.mark_seen(crawl_result.url, "expired", expires_days=365, notes="Expired one-time beyond grace")
                            return {"error": f"Expired one-time opportunity", "url": crawl_result.url}
                
                # For expired recurring/annual, set short recheck
                if opp.is_expired and opp.timing_type in [
                    OpportunityTiming.ANNUAL,
                    OpportunityTiming.RECURRING,
                    OpportunityTiming.SEASONAL
                ]:
                    opp.recheck_days = 3  # Check every 3 days for updates!
                
                # Sync to database
                try:
                    opp_id = await sync.upsert_opportunity(opp)
                    
                    # Link to user's profile
                    await sync.link_opportunity_to_user(
                        opp_id=opp_id,
                        user_id=user_profile["user_id"],
                        source="personalized_discovery",
                        curated=True
                    )
                    
                    # Mark as seen with appropriate recheck interval
                    url_cache.mark_seen(
                        crawl_result.url,
                        "success",
                        expires_days=opp.recheck_days,
                        notes=opp.title
                    )
                    
                    success_count += 1
                    
                    # Emit opportunity found event
                    emit_event("opportunity_found", {
                        "id": opp.id,
                        "title": opp.title,
                        "organization": opp.organization,
                        "category": opp.category.value,
                        "type": opp.opportunity_type.value,
                        "url": opp.url,
                        "deadline": opp.deadline.isoformat() if opp.deadline else None,
                        "start_date": opp.start_date.isoformat() if opp.start_date else None,
                        "end_date": opp.end_date.isoformat() if opp.end_date else None,
                        "timing_type": opp.timing_type.value,
                        "is_expired": opp.is_expired,
                        "next_cycle_expected": opp.next_cycle_expected.isoformat() if opp.next_cycle_expected else None,
                        "summary": opp.summary[:150] + "..." if len(opp.summary) > 150 else opp.summary,
                        "location_type": opp.location_type.value,
                        "confidence": confidence,
                        "is_personalized": True,
                        "user_id": user_profile["user_id"],
                    })
                    
                    # Add to vector DB
                    if embeddings and vector_db and settings.use_embeddings:
                        try:
                            emb_vector = embeddings.generate_for_indexing(opp.to_embedding_text())
                            vector_db.add_opportunity_with_embedding(opp, emb_vector)
                        except Exception as emb_err:
                            pass  # Silent fail
                    
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
                    sys.stderr.write(f"[Save] Error: {save_err}\n")
                    url_cache.mark_seen(crawl_result.url, "failed", expires_days=14, notes=str(save_err)[:100])
                    return {"error": f"Save failed: {save_err}", "url": crawl_result.url}
                    
            except Exception as e:
                return {"error": str(e)[:100], "url": crawl_result.url}
    
    # Run all extractions in parallel
    extraction_tasks = [extract_and_save(cr) for cr in crawl_results]
    extraction_results = await asyncio.gather(*extraction_tasks)
    
    # Count results
    failed_count = 0
    for result in extraction_results:
        if result.get("error"):
            failed_count += 1
    
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
    
    parser = argparse.ArgumentParser(description="On-demand personalized opportunity discovery")
    parser.add_argument("user_id", help="User ID for personalized discovery")
    parser.add_argument("search_query", help="Original search query that failed")
    
    args = parser.parse_args()
    
    try:
        asyncio.run(main(args.user_id, args.search_query))
    except Exception as e:
        print(json.dumps({"type": "error", "message": str(e)}))
        sys.exit(1)
