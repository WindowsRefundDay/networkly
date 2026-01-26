"""LangGraph-powered discovery agent for finding new opportunities.

Supports both global discovery (growing the database) and user-triggered 
personalized discovery (targeted search based on user profile).
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, TypedDict
import json
import sys

from langgraph.graph import END, StateGraph

from ..config import get_settings
from ..db.models import PendingURL
from ..db.sqlite_db import get_sqlite_db
from ..llm import get_llm_provider, GenerationConfig
from .query_generator import get_query_generator


class ResearchState(TypedDict):
    """State for the research/discovery agent.
    
    Supports both global discovery and personalized user-triggered curation.
    """
    
    # Core discovery fields
    focus_area: str
    search_queries: List[str]
    discovered_urls: List[str]
    evaluated_urls: List[str]
    rejected_urls: List[str]
    iteration: int
    max_iterations: int
    target_url_count: int
    
    # User profile for personalized discovery (optional)
    user_profile: Optional[Dict[str, Any]]
    is_personalized: bool
    
    # Extracted opportunities with embeddings
    extracted_opportunities: List[Dict[str, Any]]
    enriched_opportunities: List[Dict[str, Any]]
    
    # Drop reason tracking for diagnostics
    stats: Dict[str, int]  # Counters: crawl_failed, extraction_rejected, timeout, blocked, etc.


# User Profile Structure (for reference):
# {
#     "user_id": str,
#     "interests": List[str],          # ["robotics", "AI", "environmental science"]
#     "location": str,                  # "California, USA" or "Remote"
#     "grade_level": int,               # 9, 10, 11, or 12
#     "career_goals": Optional[str],    # "AI researcher" or "environmental engineer"
#     "preferred_ec_types": List[str],  # ["internship", "competition", "research"]
#     "academic_strengths": List[str],  # ["math", "physics", "computer science"]
#     "availability": str               # "summer", "academic year", "flexible"
# }


# Category-specific query templates (fallback)
QUERY_TEMPLATES = {
    "competitions": [
        "{focus} olympiad high school 2026",
        "{focus} competition for teenagers",
        "national {focus} contest students",
        "{focus} challenge high school registration",
        "science fair {focus} competition",
        "{focus} bowl tournament high school",
    ],
    "internships": [
        "{focus} internship high school summer 2026",
        "{focus} research program underrepresented students",
        "paid {focus} internship teenagers",
        "{focus} industry internship high school",
        "remote {focus} internship students",
    ],
    "summer_programs": [
        "{focus} summer program high school",
        "residential {focus} camp teenagers",
        "{focus} intensive program high school students",
        "university {focus} summer program",
    ],
    "scholarships": [
        "{focus} scholarship high school students",
        "{focus} merit scholarship application",
        "{focus} scholarship competition 2026",
    ],
    "research": [
        "{focus} research opportunity high school",
        "{focus} science research program teenagers",
        "undergraduate {focus} research high school",
    ],
    "volunteering": [
        "{focus} volunteer opportunities youth",
        "{focus} community service program high school",
    ],
    "general": [
        "high school {focus} opportunities 2026",
        "{focus} program for teenagers",
        "{focus} opportunities students apply now",
        "{focus} youth program application",
        "best {focus} programs high school students",
        "{focus} extracurricular high school",
    ],
}


# Profiler prompt for personalized discovery
PROFILER_PROMPT = """You are an expert career advisor for high school students.

Analyze this student profile and generate EXACTLY 5 highly targeted search queries to find the MOST relevant opportunities.

STUDENT PROFILE:
- Interests: {interests}
- Location: {location}
- Grade Level: {grade_level}
- Career Goals: {career_goals}
- Preferred Opportunity Types: {preferred_types}
- Academic Strengths: {strengths}
- Availability: {availability}

REQUIREMENTS:
1. Generate 5 SPECIFIC, TARGETED queries (not generic)
2. Incorporate their interests, location, and career goals
3. Prioritize their preferred opportunity types
4. Include location filters if specified (or "remote" if they want remote)
5. Make queries actionable with terms like "application", "deadline", "eligibility"

Return ONLY a JSON array of 5 query strings:
["query 1", "query 2", "query 3", "query 4", "query 5"]
"""


# URL evaluation prompt
URL_EVALUATION_PROMPT = """You are evaluating whether URLs contain legitimate opportunities for high school students.

For each URL and snippet below, determine if it's likely to be:
- A real opportunity (competition, internship, camp, program, etc.)
- Targeting high school students
- Still active/current

URLs to evaluate:
{urls_with_snippets}

Respond with ONLY a JSON object mapping URLs to boolean (true = real opportunity):
{{"https://example.com": true, "https://blog.example.com": false}}"""


class DiscoveryAgent:
    """Agent that discovers new opportunities using LangGraph.
    
    Supports two modes:
    1. Global Discovery: General search to grow the database
    2. Personalized Discovery: User-triggered search based on profile
    """

    def __init__(self):
        """Initialize the discovery agent."""
        self.provider = get_llm_provider()
        self.query_generator = get_query_generator()
        self.db = get_sqlite_db()
        self._graph = self._build_graph()
    
    def _generate_template_queries(self, focus_area: str, num_queries: int = 10) -> List[str]:
        """
        Generate queries using category-specific templates.
        
        Args:
            focus_area: Focus area for discovery
            num_queries: Number of queries to generate
            
        Returns:
            List of generated queries
        """
        queries = []
        
        # Detect category from focus area
        focus_lower = focus_area.lower()
        category = "general"
        
        for cat_key in QUERY_TEMPLATES.keys():
            if cat_key in focus_lower or any(term in focus_lower for term in cat_key.split('_')):
                category = cat_key
                break
        
        # Get templates for category
        templates = QUERY_TEMPLATES.get(category, QUERY_TEMPLATES["general"])
        
        # Generate queries from templates
        import random
        selected_templates = random.sample(templates, min(len(templates), num_queries))
        
        for template in selected_templates:
            query = template.format(focus=focus_area)
            queries.append(query)
        
        # Fill remaining with general templates if needed
        if len(queries) < num_queries:
            general_templates = QUERY_TEMPLATES["general"]
            remaining = num_queries - len(queries)
            for template in random.sample(general_templates, min(len(general_templates), remaining)):
                query = template.format(focus=focus_area)
                if query not in queries:
                    queries.append(query)
        
        return queries[:num_queries]
    
    def _score_url(self, url: str, snippet: str = "") -> float:
        """
        Score a URL based on domain reputation and URL patterns.
        
        Args:
            url: URL to score
            snippet: Search result snippet (optional)
            
        Returns:
            Score from 0.0 to 1.0 (higher is better)
        """
        score = 0.5  # Base score
        url_lower = url.lower()
        
        # High-reputation domains (educational, government, major organizations)
        if any(domain in url_lower for domain in ['.edu', '.gov']):
            score += 0.25
        elif '.org' in url_lower:
            score += 0.15
        
        # Well-known opportunity platforms
        high_value_domains = [
            'nasa.gov', 'nsf.gov', 'nih.gov', 'doe.gov',
            'collegeboard.org', 'commonapp.org',
            'scholarship', 'internship', 'competition',
        ]
        if any(domain in url_lower for domain in high_value_domains):
            score += 0.15

        # Downrank known low-signal domains (SEO farms, generic content)
        low_signal_domains = [
            'faqtoids.com', 'simpli.com', 'smarter.com',
            'usingenglish.com', 'consumersearch.com',
            'bloglines.com', 'reference.com',
        ]
        if any(domain in url_lower for domain in low_signal_domains):
            score -= 0.35
        
        # Positive URL patterns
        positive_patterns = [
            'program', 'apply', 'application', 'opportunity',
            'scholarship', 'internship', 'competition', 'summer',
            'student', 'youth', 'teen', 'high-school',
        ]
        matches = sum(1 for pattern in positive_patterns if pattern in url_lower)
        score += min(matches * 0.05, 0.2)
        
        # Negative patterns (lower score)
        negative_patterns = [
            'blog', 'news', 'article', 'reddit', 'forum',
            'facebook', 'twitter', 'linkedin', 'indeed',
            '/blog/', '/guides/', '/guide/', '/article/', '/news/', '/post/', '/how-to/',
            'how-to', 'ultimate-guide', 'top-10', 'best-', 'ranking', 'list-',
        ]
        if any(pattern in url_lower for pattern in negative_patterns):
            score -= 0.3
        
        # Check snippet for relevance
        if snippet:
            snippet_lower = snippet.lower()
            relevance_terms = ['high school', 'students', 'apply', 'deadline', 'application']
            if any(term in snippet_lower for term in relevance_terms):
                score += 0.1
        
        return max(0.0, min(1.0, score))

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph with conditional routing for personalized/global discovery."""
        graph = StateGraph(ResearchState)

        # Add nodes
        graph.add_node("profiler", self._profiler_node)      # Personalized query generation
        graph.add_node("planner", self._planner_node)        # Global query generation
        graph.add_node("searcher", self._searcher_node)      # SearXNG search
        graph.add_node("evaluator", self._evaluator_node)    # URL evaluation
        graph.add_node("extractor", self._extractor_node)    # Content extraction with Crawl4AI + Gemini
        graph.add_node("embedder", self._embedder_node)      # Vector embedding with text-embedding-004
        graph.add_node("saver", self._saver_node)            # Save to pending queue

        # Conditional entry point: profiler if user_profile exists, else planner
        graph.add_conditional_edges(
            "__start__",
            self._route_entry,
            {
                "profiler": "profiler",
                "planner": "planner",
            }
        )
        
        # Both profiler and planner lead to searcher
        graph.add_edge("profiler", "searcher")
        graph.add_edge("planner", "searcher")
        
        # Main pipeline
        graph.add_edge("searcher", "evaluator")
        graph.add_edge("evaluator", "extractor")
        graph.add_edge("extractor", "embedder")
        graph.add_edge("embedder", "saver")
        
        # Conditional edge: loop back or end
        graph.add_conditional_edges(
            "saver",
            self._should_continue,
            {
                "continue": "planner",  # Always use planner for subsequent iterations
                "end": END,
            }
        )

        return graph.compile()
    
    def _route_entry(self, state: ResearchState) -> str:
        """Route to profiler if user_profile exists, else planner."""
        if state.get("user_profile"):
            return "profiler"
        return "planner"

    async def _profiler_node(self, state: ResearchState) -> dict:
        """
        Analyze user profile using Gemini 2.5 Flash-Lite to generate 5 targeted queries.
        Only called when user_profile is present.
        """
        user_profile = state.get("user_profile")
        if not user_profile:
            return {"search_queries": [], "is_personalized": False}
        
        # Build profiler prompt
        prompt = PROFILER_PROMPT.format(
            interests=", ".join(user_profile.get("interests", [])) or "Not specified",
            location=user_profile.get("location", "Any"),
            grade_level=user_profile.get("grade_level", "High School"),
            career_goals=user_profile.get("career_goals", "Not specified"),
            preferred_types=", ".join(user_profile.get("preferred_ec_types", [])) or "Any",
            strengths=", ".join(user_profile.get("academic_strengths", [])) or "Not specified",
            availability=user_profile.get("availability", "Flexible"),
        )
        
        try:
            config = GenerationConfig(
                temperature=0.7,
                max_output_tokens=500,
                use_fast_model=True,  # Use gemini-2.5-flash-lite
            )
            
            response = await self.provider.generate(prompt, config)
            
            # Clean response
            response_text = response.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            
            queries = json.loads(response_text)
            
            if not isinstance(queries, list) or len(queries) < 3:
                raise ValueError("Invalid query list")
            
            sys.stderr.write(f"[Profiler] Generated {len(queries)} personalized queries\n")
            
            return {
                "search_queries": queries[:5],
                "is_personalized": True,
            }
            
        except Exception as e:
            sys.stderr.write(f"[Profiler] Error generating queries: {e}\n")
            # Fallback: use focus area with user interests
            interests = user_profile.get("interests", [])
            focus = state.get("focus_area", "opportunities")
            fallback_queries = [
                f"{interest} {focus} high school 2026" for interest in interests[:3]
            ]
            fallback_queries.extend([
                f"high school {focus} application",
                f"best {focus} programs for teenagers",
            ])
            return {
                "search_queries": fallback_queries[:5],
                "is_personalized": True,
            }

    async def _planner_node(self, state: ResearchState) -> dict:
        """Generate search queries based on focus area using AI query generator."""
        # Use AI-powered query generator (gemini-2.5-flash-lite)
        try:
            ai_queries = await self.query_generator.generate_queries(
                state["focus_area"],
                count=15,  # Generate 15 diverse queries
            )
            
            if len(ai_queries) >= 10:
                return {"search_queries": ai_queries[:20]}
        
        except Exception as e:
            sys.stderr.write(f"[Planner] AI query generation error, using templates: {e}\n")
        
        # Fallback to template-based queries if AI fails
        template_queries = self._generate_template_queries(
            state["focus_area"],
            num_queries=15,
        )
        
        return {"search_queries": template_queries[:20]}

    async def _searcher_node(self, state: ResearchState) -> dict:
        """Search for URLs using the generated queries using SearXNG."""
        from ..search.searxng_client import get_searxng_client
        
        search_client = get_searxng_client()
        all_discovered = list(state.get("discovered_urls", []))
        seen_urls = set(all_discovered)
        url_scores = {}
        
        queries = state.get("search_queries", [])
        
        # Personalized searches get more results per query
        results_per_query = 15 if state.get("is_personalized") else 10
        
        for query in queries:
            try:
                results = await search_client.search(query, max_results=results_per_query)
                for result in results:
                    if result.url not in seen_urls:
                        seen_urls.add(result.url)
                        all_discovered.append(result.url)
                        url_scores[result.url] = self._score_url(result.url, result.snippet)
            except Exception as e:
                sys.stderr.write(f"[Searcher] Search error for '{query}': {e}\n")
                continue
        
        # Sort URLs by score (highest first)
        scored_urls = sorted(
            [(url, url_scores.get(url, 0.5)) for url in all_discovered],
            key=lambda x: x[1],
            reverse=True
        )
        prioritized_urls = [url for url, score in scored_urls]
        
        sys.stderr.write(f"[Searcher] Found {len(prioritized_urls)} URLs\n")
                    
        return {"discovered_urls": prioritized_urls}

    async def _evaluator_node(self, state: ResearchState) -> dict:
        """Evaluate discovered URLs (accept all for now, real implementation would use LLM)."""
        urls = state.get("discovered_urls", [])
        if not urls:
            return {"evaluated_urls": [], "rejected_urls": []}

        # For now, accept all URLs
        return {
            "evaluated_urls": urls,
            "rejected_urls": [],
        }

    async def _extractor_node(self, state: ResearchState) -> dict:
        """Extract structured data from evaluated URLs using Crawl4AI + Gemini."""
        from ..crawlers.crawl4ai_client import get_crawler
        from .extractor import get_extractor
        
        urls = state.get("evaluated_urls", [])
        if not urls:
            return {"extracted_opportunities": [], "stats": state.get("stats", {})}
        
        crawler = get_crawler()
        extractor = get_extractor()
        
        # Initialize stats tracking
        stats = dict(state.get("stats", {}))
        stats.setdefault("urls_attempted", 0)
        stats.setdefault("crawl_failed", 0)
        stats.setdefault("crawl_timeout", 0)
        stats.setdefault("crawl_blocked", 0)
        stats.setdefault("extraction_rejected", 0)
        stats.setdefault("extraction_error", 0)
        stats.setdefault("extraction_success", 0)
        
        extracted_opportunities = []
        max_urls = 10 if state.get("is_personalized") else 15
        
        for url in urls[:max_urls]:
            stats["urls_attempted"] += 1
            try:
                # Crawl webpage
                crawl_result = await crawler.crawl(url)
                if not crawl_result.success:
                    # Categorize crawl failure
                    error_msg = (crawl_result.error or "").lower()
                    if "timeout" in error_msg:
                        stats["crawl_timeout"] += 1
                    elif "blocked" in error_msg:
                        stats["crawl_blocked"] += 1
                    else:
                        stats["crawl_failed"] += 1
                    continue
                
                if not crawl_result.markdown:
                    stats["crawl_failed"] += 1
                    continue
                
                # Extract structured data
                result = await extractor.extract(
                    content=crawl_result.markdown,
                    url=url,
                    source_url=None,
                )
                
                if result.success and result.opportunity_card:
                    stats["extraction_success"] += 1
                    extracted_opportunities.append({
                        "url": url,
                        "data": result.opportunity_card.model_dump(),
                        "confidence": result.confidence,
                    })
                    sys.stderr.write(f"[Extractor] ✓ Extracted: {result.opportunity_card.title}\n")
                else:
                    stats["extraction_rejected"] += 1
                    
            except asyncio.TimeoutError:
                stats["crawl_timeout"] += 1
                sys.stderr.write(f"[Extractor] Timeout processing {url}\n")
            except Exception as e:
                stats["extraction_error"] += 1
                sys.stderr.write(f"[Extractor] Error processing {url}: {e}\n")
        
        # Log summary
        sys.stderr.write(
            f"[Extractor] Summary: {stats['extraction_success']}/{stats['urls_attempted']} extracted | "
            f"crawl_failed={stats['crawl_failed']} timeout={stats['crawl_timeout']} "
            f"blocked={stats['crawl_blocked']} rejected={stats['extraction_rejected']} "
            f"errors={stats['extraction_error']}\n"
        )
        
        return {"extracted_opportunities": extracted_opportunities, "stats": stats}

    async def _embedder_node(self, state: ResearchState) -> dict:
        """Generate embeddings using text-embedding-004."""
        from ..embeddings import get_embeddings
        
        opportunities = state.get("extracted_opportunities", [])
        if not opportunities:
            return {"enriched_opportunities": []}
        
        settings = get_settings()
        if not settings.use_embeddings:
            # Skip embeddings, just pass through
            enriched = [{
                "json_data": opp["data"],
                "embedding": None,
                "url": opp["url"],
                "confidence": opp["confidence"],
                "is_personalized": state.get("is_personalized", False),
                "user_id": state.get("user_profile", {}).get("user_id") if state.get("user_profile") else None,
            } for opp in opportunities]
            return {"enriched_opportunities": enriched}
        
        try:
            embeddings_client = get_embeddings()
        except Exception as e:
            sys.stderr.write(f"[Embedder] Failed to initialize embeddings: {e}\n")
            # Return without embeddings
            enriched = [{
                "json_data": opp["data"],
                "embedding": None,
                "url": opp["url"],
                "confidence": opp["confidence"],
                "is_personalized": state.get("is_personalized", False),
                "user_id": state.get("user_profile", {}).get("user_id") if state.get("user_profile") else None,
            } for opp in opportunities]
            return {"enriched_opportunities": enriched}
        
        enriched_opportunities = []
        
        for opp in opportunities:
            data = opp["data"]
            
            # Combine summary and tags for embedding
            tags_str = ", ".join(data.get("tags", []))
            text_to_embed = f"{data.get('title', '')} {data.get('summary', '')} Tags: {tags_str}"
            
            try:
                # Generate embedding using text-embedding-004
                embedding = embeddings_client.generate_for_indexing(text_to_embed)
                
                enriched_opportunities.append({
                    "json_data": data,
                    "embedding": embedding,
                    "url": opp["url"],
                    "confidence": opp["confidence"],
                    "is_personalized": state.get("is_personalized", False),
                    "user_id": state.get("user_profile", {}).get("user_id") if state.get("user_profile") else None,
                })
                
            except Exception as e:
                sys.stderr.write(f"[Embedder] Embedding error for {data.get('title', 'unknown')}: {e}\n")
                # Add without embedding
                enriched_opportunities.append({
                    "json_data": data,
                    "embedding": None,
                    "url": opp["url"],
                    "confidence": opp["confidence"],
                    "is_personalized": state.get("is_personalized", False),
                    "user_id": state.get("user_profile", {}).get("user_id") if state.get("user_profile") else None,
                })
        
        sys.stderr.write(f"[Embedder] Generated embeddings for {len(enriched_opportunities)} opportunities\n")
        
        return {"enriched_opportunities": enriched_opportunities}

    async def _saver_node(self, state: ResearchState) -> dict:
        """Save evaluated URLs to the pending queue."""
        evaluated_urls = state.get("evaluated_urls", [])
        
        for url in evaluated_urls:
            pending = PendingURL(
                url=url,
                source=f"discovery:{state['focus_area']}",
                priority=5,
            )
            self.db.add_pending_url(pending)

        return {"iteration": state["iteration"] + 1}

    def _should_continue(self, state: ResearchState) -> str:
        """Determine if we should continue the discovery loop."""
        # Personalized searches only run once (no looping)
        if state.get("is_personalized"):
            return "end"
        
        if state["iteration"] >= state["max_iterations"]:
            return "end"
        if len(state["evaluated_urls"]) >= state["target_url_count"]:
            return "end"
        return "continue"

    async def run(
        self,
        focus_area: str,
        user_profile: Optional[Dict[str, Any]] = None,
        max_iterations: int = 2,
        target_url_count: int = 150,
    ) -> Dict[str, Any]:
        """
        Run the discovery agent.
        
        Args:
            focus_area: Area to focus on (e.g., "STEM competitions")
            user_profile: Optional user profile for personalized discovery
            max_iterations: Maximum planning iterations
            target_url_count: Target number of URLs to find
            
        Returns:
            Final state with discovered URLs and enriched opportunities
        """
        initial_state: ResearchState = {
            "focus_area": focus_area,
            "search_queries": [],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": max_iterations,
            "target_url_count": target_url_count,
            "user_profile": user_profile,
            "is_personalized": user_profile is not None,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        final_state = await self._graph.ainvoke(initial_state)
        
        # Log final run summary
        stats = final_state.get("stats", {})
        if stats:
            sys.stderr.write(
                f"\n[Discovery] Run complete for '{focus_area}':\n"
                f"  URLs discovered: {len(final_state.get('discovered_urls', []))}\n"
                f"  URLs attempted: {stats.get('urls_attempted', 0)}\n"
                f"  Extraction success: {stats.get('extraction_success', 0)}\n"
                f"  Drop reasons:\n"
                f"    - Crawl failed: {stats.get('crawl_failed', 0)}\n"
                f"    - Crawl timeout: {stats.get('crawl_timeout', 0)}\n"
                f"    - Domain blocked: {stats.get('crawl_blocked', 0)}\n"
                f"    - Content rejected: {stats.get('extraction_rejected', 0)}\n"
                f"    - Extraction error: {stats.get('extraction_error', 0)}\n"
            )
        
        return {
            "evaluated_urls": final_state.get("evaluated_urls", []),
            "enriched_opportunities": final_state.get("enriched_opportunities", []),
            "is_personalized": final_state.get("is_personalized", False),
            "stats": stats,
        }


# Singleton
_discovery_instance: Optional[DiscoveryAgent] = None


def get_discovery_agent() -> DiscoveryAgent:
    """Get the discovery agent singleton."""
    global _discovery_instance
    if _discovery_instance is None:
        _discovery_instance = DiscoveryAgent()
    return _discovery_instance
