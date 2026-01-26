"""SearXNG search client for opportunity discovery."""

import asyncio
import sys
from dataclasses import dataclass
from typing import List, Optional
from urllib.parse import urlparse
import aiohttp

from ..config import get_settings, is_blocked_domain, get_domain
from ..utils.retry import retry_async, SEARCH_RETRY_CONFIG


@dataclass
class SearchResult:
    """A single search result from SearXNG."""
    
    url: str
    title: str
    snippet: str
    engine: str
    score: float = 0.0


class SearXNGClient:
    """Client for querying SearXNG metasearch engine."""
    
    # Working engines that return good results for opportunity searches
    # Removed mojeek as it's getting 403 blocked
    # Wikipedia removed - we filter it out anyway
    DEFAULT_ENGINES: List[str] = ['bing', 'yahoo', 'ask', 'google']
    
    # Engines to exclude - those with consistent issues
    DEFAULT_EXCLUDED_ENGINES: List[str] = [
        'startpage',   # CAPTCHA issues
        'wikipedia',   # We filter Wikipedia anyway
    ]
    
    # Query expansion synonyms for opportunity types
    QUERY_SYNONYMS = {
        'internship': ['internship', 'externship', 'work experience'],
        'scholarship': ['scholarship', 'grant', 'financial aid', 'award'],
        'competition': ['competition', 'contest', 'challenge', 'olympiad'],
        'program': ['program', 'initiative', 'opportunity'],
        'summer': ['summer', 'seasonal', 'vacation'],
        'research': ['research', 'lab', 'study'],
    }

    LOW_SIGNAL_DOMAINS = {
        'faqtoids.com', 'simpli.com', 'smarter.com',
        'usingenglish.com', 'consumersearch.com',
        'bloglines.com', 'reference.com',
        'worldscholarshipforum.com',  # Generic scholarship aggregator
    }
    
    # High-value domains that frequently have real EC opportunities
    HIGH_VALUE_DOMAINS = {
        'nasa.gov', 'nsf.gov', 'nih.gov', 'doe.gov',
        'collegeboard.org', 'commonapp.org',
        'scienceolympiad.org', 'artofproblemsolving.com',
        'firstinspires.org', 'mathcounts.org',
        'mit.edu', 'stanford.edu', 'harvard.edu', 'cmu.edu',
    }
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize the SearXNG client.
        
        Args:
            base_url: SearXNG instance URL. Defaults to settings value.
        """
        settings = get_settings()
        self.base_url = base_url or getattr(settings, 'searxng_url', 'http://localhost:8080')
        # Use centralized timeout from settings
        self.timeout = aiohttp.ClientTimeout(total=settings.search_timeout_seconds)
        self._result_cache = {}  # Simple in-memory cache for deduplication
    
    def expand_query(self, query: str) -> List[str]:
        """
        Expand a query with synonyms for better coverage.
        
        Args:
            query: Original search query
            
        Returns:
            List of query variations (including original)
        """
        queries = [query]
        query_lower = query.lower()
        
        # Check for expandable terms
        for term, synonyms in self.QUERY_SYNONYMS.items():
            if term in query_lower:
                # Create variants with different synonyms
                for synonym in synonyms:
                    if synonym != term:  # Don't duplicate original
                        variant = query_lower.replace(term, synonym)
                        queries.append(variant)
                break  # Only expand one term at a time to avoid explosion
        
        return queries[:3]  # Limit to 3 variations max
    
    def deduplicate_results(self, results: List[SearchResult]) -> List[SearchResult]:
        """
        Deduplicate search results by domain and title similarity.
        Also filters out blocked domains.
        
        Args:
            results: List of search results
            
        Returns:
            Deduplicated and filtered list
        """
        seen_urls = set()
        seen_domains = {}  # domain -> count
        deduplicated = []
        blocked_count = 0

        # Prioritize higher-signal domains before deduplication
        results_sorted = sorted(
            results,
            key=lambda r: (self._domain_priority(get_domain(r.url)), r.score),
            reverse=True,
        )

        for result in results_sorted:
            # Skip exact URL duplicates
            if result.url in seen_urls:
                continue
            
            # Skip blocked domains (fast check)
            if is_blocked_domain(result.url):
                blocked_count += 1
                continue
            
            # Extract domain
            try:
                domain = urlparse(result.url).netloc.lower()
                if domain.startswith('www.'):
                    domain = domain[4:]
            except Exception:
                domain = result.url
            
            # Limit results per domain based on quality signal
            domain_count = seen_domains.get(domain, 0)
            max_per_domain = self._max_results_per_domain(domain)
            if domain_count >= max_per_domain:
                continue
            
            seen_urls.add(result.url)
            seen_domains[domain] = domain_count + 1
            deduplicated.append(result)
        
        if blocked_count > 0:
            sys.stderr.write(f"[SearXNG] Blocked {blocked_count} results from blocklist\n")
        
        return deduplicated

    def _domain_priority(self, domain: str) -> float:
        """Score domain quality for ordering search results."""
        if not domain:
            return 0.0
        if domain in self.LOW_SIGNAL_DOMAINS:
            return 0.1
        # Check high-value domains first (exact or subdomain match)
        for hv in self.HIGH_VALUE_DOMAINS:
            if domain == hv or domain.endswith('.' + hv):
                return 1.2
        if domain.endswith(".edu") or domain.endswith(".gov"):
            return 1.0
        if domain.endswith(".org"):
            return 0.7
        return 0.4

    def _max_results_per_domain(self, domain: str) -> int:
        """Adjust per-domain caps based on quality signal."""
        if not domain:
            return 1
        if domain in self.LOW_SIGNAL_DOMAINS:
            return 1
        # High-value domains get more slots
        for hv in self.HIGH_VALUE_DOMAINS:
            if domain == hv or domain.endswith('.' + hv):
                return 4
        if domain.endswith(".edu") or domain.endswith(".gov"):
            return 3
        return 2
    
    async def _execute_single_search(
        self,
        search_query: str,
        params: dict,
        max_results: int,
    ) -> List[SearchResult]:
        """Execute a single search query with retry logic."""
        results = []
        
        async def do_search() -> dict:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(
                    f"{self.base_url}/search",
                    params=params,
                ) as response:
                    if response.status != 200:
                        raise aiohttp.ClientError(f"SearXNG returned status {response.status}")
                    return await response.json()
        
        try:
            data = await retry_async(
                do_search,
                config=SEARCH_RETRY_CONFIG,
                operation_name=f"SearXNG search '{search_query[:30]}...'",
            )
            
            # Check for regular results
            for item in data.get('results', [])[:max_results]:
                results.append(SearchResult(
                    url=item.get('url', ''),
                    title=item.get('title', ''),
                    snippet=item.get('content', ''),
                    engine=item.get('engine', 'unknown'),
                    score=item.get('score', 0.0),
                ))

            # Also check infoboxes (Wikipedia returns these)
            for infobox in data.get('infoboxes', []):
                urls = infobox.get('urls', [])
                for url_info in urls[:3]:  # Get first 3 URLs from infobox
                    results.append(SearchResult(
                        url=url_info.get('url', ''),
                        title=f"{infobox.get('infobox', 'Wikipedia')}: {url_info.get('title', 'Link')}",
                        snippet=infobox.get('content', ''),
                        engine=infobox.get('engine', 'wikipedia'),
                        score=0.9,  # Higher score for infobox results
                    ))
                    
        except Exception as e:
            sys.stderr.write(f"[SearXNG] Search failed after retries: {e}\n")
        
        return results

    async def search(
        self,
        query: str,
        categories: Optional[List[str]] = None,
        engines: Optional[List[str]] = None,
        excluded_engines: Optional[List[str]] = None,
        max_results: int = 20,
        expand_query: bool = False,
    ) -> List[SearchResult]:
        """
        Perform a search using SearXNG with retry logic.
        
        Args:
            query: The search query
            categories: Optional list of categories (e.g., ['general', 'news'])
            engines: Optional list of specific engines to use
            excluded_engines: Engines to exclude (defaults to duckduckgo to avoid CAPTCHA)
            max_results: Maximum number of results to return
            expand_query: If True, search with query variations for better coverage
            
        Returns:
            List of SearchResult objects
        """
        all_results = []
        
        # Get query variations if expansion is enabled
        queries = [query]
        if expand_query:
            queries = self.expand_query(query)
        
        for search_query in queries:
            params = {
                'q': search_query,
                'format': 'json',
                'pageno': 1,
                'language': 'en',  # Force English results only
                'safesearch': 0,   # Don't filter educational content
            }
            
            if categories:
                params['categories'] = ','.join(categories)
            
            # Use default working engines if none specified
            engines_to_use = engines if engines else self.DEFAULT_ENGINES
            if engines_to_use:
                params['engines'] = ','.join(engines_to_use)
            
            # Build disabled engines string
            excluded = excluded_engines if excluded_engines is not None else self.DEFAULT_EXCLUDED_ENGINES
            if excluded:
                params['disabled_engines'] = ','.join(excluded)
            
            results = await self._execute_single_search(search_query, params, max_results)
            all_results.extend(results)
        
        # Deduplicate and limit results
        deduplicated = self.deduplicate_results(all_results)
        return deduplicated[:max_results]
    
    async def search_opportunities(
        self,
        focus_area: str,
        opportunity_types: Optional[List[str]] = None,
        max_results: int = 30,
    ) -> List[SearchResult]:
        """
        Search for opportunities in a specific focus area.
        
        Args:
            focus_area: Area to search (e.g., "STEM internships")
            opportunity_types: Types like ["internship", "scholarship"]
            max_results: Maximum results per query
            
        Returns:
            Deduplicated list of SearchResult objects
        """
        types = opportunity_types or ["internship", "scholarship", "competition", "fellowship"]
        all_results: List[SearchResult] = []
        seen_urls = set()
        
        for opp_type in types:
            query = f"{focus_area} {opp_type} for students 2026"
            results = await self.search(query, max_results=max_results // len(types))
            
            for result in results:
                if result.url not in seen_urls:
                    seen_urls.add(result.url)
                    all_results.append(result)
        
        return all_results


# Singleton
_client_instance: Optional[SearXNGClient] = None


def get_searxng_client() -> SearXNGClient:
    """Get the SearXNG client singleton."""
    global _client_instance
    if _client_instance is None:
        _client_instance = SearXNGClient()
    return _client_instance
