"""SearXNG search client for opportunity discovery."""

import asyncio
from dataclasses import dataclass
from typing import List, Optional
import aiohttp

from ..config import get_settings


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
    
    # Engines to exclude by default (empty = use all available)
    # DuckDuckGo can cause CAPTCHA issues but provides good results when it works
    DEFAULT_EXCLUDED_ENGINES: List[str] = []
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize the SearXNG client.
        
        Args:
            base_url: SearXNG instance URL. Defaults to settings value.
        """
        settings = get_settings()
        self.base_url = base_url or getattr(settings, 'searxng_url', 'http://localhost:8080')
        self.timeout = aiohttp.ClientTimeout(total=30)
    
    async def search(
        self,
        query: str,
        categories: Optional[List[str]] = None,
        engines: Optional[List[str]] = None,
        excluded_engines: Optional[List[str]] = None,
        max_results: int = 20,
    ) -> List[SearchResult]:
        """
        Perform a search using SearXNG.
        
        Args:
            query: The search query
            categories: Optional list of categories (e.g., ['general', 'news'])
            engines: Optional list of specific engines to use
            excluded_engines: Engines to exclude (defaults to duckduckgo to avoid CAPTCHA)
            max_results: Maximum number of results to return
            
        Returns:
            List of SearchResult objects
        """
        params = {
            'q': query,
            'format': 'json',
            'pageno': 1,
        }
        
        if categories:
            params['categories'] = ','.join(categories)
        if engines:
            params['engines'] = ','.join(engines)
        
        # Build disabled engines string
        excluded = excluded_engines if excluded_engines is not None else self.DEFAULT_EXCLUDED_ENGINES
        if excluded:
            params['disabled_engines'] = ','.join(excluded)
        
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(
                    f"{self.base_url}/search",
                    params=params,
                ) as response:
                    if response.status != 200:
                        print(f"SearXNG error: {response.status}")
                        return []
                    
                    data = await response.json()
                    results = []
                    
                    for item in data.get('results', [])[:max_results]:
                        results.append(SearchResult(
                            url=item.get('url', ''),
                            title=item.get('title', ''),
                            snippet=item.get('content', ''),
                            engine=item.get('engine', 'unknown'),
                            score=item.get('score', 0.0),
                        ))
                    
                    return results
                    
        except aiohttp.ClientError as e:
            print(f"SearXNG connection error: {e}")
            return []
        except Exception as e:
            print(f"SearXNG search error: {e}")
            return []
    
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
