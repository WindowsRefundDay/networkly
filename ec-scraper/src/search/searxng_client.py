"""SearXNG search client for opportunity discovery."""

import asyncio
import sys
from dataclasses import dataclass
from typing import List, Optional, Set
from urllib.parse import urlparse
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


# Domain blocklist - sites that never contain high school opportunities
# Grouped by category for maintainability
BLOCKED_DOMAINS: Set[str] = {
    # Chinese/Asian language sites (non-English)
    'zhihu.com', 'baidu.com', 'weixin.qq.com', 'sina.com', 'sina.com.cn',
    'bilibili.com', 'douban.com', 'csdn.net', '163.com', 'sohu.com',
    'weibo.com', 'taobao.com', 'alibaba.com', 'jd.com', 'tmall.com',
    'qq.com', 'tencent.com', 'youku.com', 'iqiyi.com', 'cctv.com',
    'cnblogs.com', 'jianshu.com', 'zhaopin.com', '51job.com',
    'naver.com', 'daum.net',  # Korean
    'rakuten.co.jp', 'yahoo.co.jp', 'livedoor.jp',  # Japanese
    
    # Social media (no program listings)
    'reddit.com', 'facebook.com', 'twitter.com', 'instagram.com',
    'youtube.com', 'tiktok.com', 'snapchat.com', 'pinterest.com',
    'tumblr.com', 'discord.com', 'threads.net', 'x.com',
    
    # Job boards (adult jobs, not HS programs)
    'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'monster.com',
    'careerbuilder.com', 'simplyhired.com', 'workday.com', 'lever.co',
    'greenhouse.io', 'hire.withgoogle.com',
    
    # Reference/dictionary sites (no program info)
    'wikipedia.org', 'wiktionary.org', 'merriam-webster.com',
    'dictionary.com', 'thesaurus.com', 'britannica.com',
    'quora.com', 'answers.com', 'ask.com',
    
    # News aggregators (articles, not programs)
    'news.google.com', 'news.yahoo.com', 'msn.com',
    'huffpost.com', 'buzzfeed.com', 'vice.com',
    
    # Shopping sites
    'amazon.com', 'ebay.com', 'walmart.com', 'target.com',
    'etsy.com', 'aliexpress.com', 'wish.com',
    
    # Entertainment
    'netflix.com', 'hulu.com', 'spotify.com', 'soundcloud.com',
    'twitch.tv', 'imdb.com', 'rottentomatoes.com',
    
    # File sharing / forums
    'mega.nz', 'dropbox.com', 'drive.google.com',
    'stackexchange.com', 'stackoverflow.com',
    
    # Other non-opportunity sites
    'medium.com',  # Blog platform (articles, not programs)
    'substack.com', 'ghost.io',
    'yelp.com', 'tripadvisor.com',
    'weather.com', 'accuweather.com',
}


def is_blocked_domain(url: str) -> bool:
    """Check if a URL is from a blocked domain."""
    try:
        domain = urlparse(url).netloc.lower()
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Check exact match
        if domain in BLOCKED_DOMAINS:
            return True
        
        # Check if it's a subdomain of blocked domain
        for blocked in BLOCKED_DOMAINS:
            if domain.endswith('.' + blocked):
                return True
        
        return False
    except Exception:
        return False


class SearXNGClient:
    """Client for querying SearXNG metasearch engine."""
    
    # Working engines that return good results for opportunity searches
    # Removed mojeek as it's getting 403 blocked
    # Wikipedia removed - we filter it out anyway
    DEFAULT_ENGINES: List[str] = ['bing', 'yahoo', 'ask', 'google']
    
    # Engines to exclude - those with consistent issues
    DEFAULT_EXCLUDED_ENGINES: List[str] = [
        'duckduckgo',  # CAPTCHA errors
        'brave',       # Rate limited
        'startpage',   # CAPTCHA issues
        'mojeek',      # 403 Forbidden (blocked)
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
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Initialize the SearXNG client.
        
        Args:
            base_url: SearXNG instance URL. Defaults to settings value.
        """
        settings = get_settings()
        self.base_url = base_url or getattr(settings, 'searxng_url', 'http://localhost:8080')
        self.timeout = aiohttp.ClientTimeout(total=30)
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
        
        for result in results:
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
            
            # Limit results per domain (max 3 from same domain)
            domain_count = seen_domains.get(domain, 0)
            if domain_count >= 3:
                continue
            
            seen_urls.add(result.url)
            seen_domains[domain] = domain_count + 1
            deduplicated.append(result)
        
        if blocked_count > 0:
            sys.stderr.write(f"[SearXNG] Blocked {blocked_count} results from blocklist\n")
        
        return deduplicated
    
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
        Perform a search using SearXNG.
        
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
            
            try:
                async with aiohttp.ClientSession(timeout=self.timeout) as session:
                    async with session.get(
                        f"{self.base_url}/search",
                        params=params,
                    ) as response:
                        if response.status != 200:
                            sys.stderr.write(f"SearXNG error: {response.status}\n")
                            continue

                        data = await response.json()

                        # Check for regular results
                        for item in data.get('results', [])[:max_results]:
                            all_results.append(SearchResult(
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
                                all_results.append(SearchResult(
                                    url=url_info.get('url', ''),
                                    title=f"{infobox.get('infobox', 'Wikipedia')}: {url_info.get('title', 'Link')}",
                                    snippet=infobox.get('content', ''),
                                    engine=infobox.get('engine', 'wikipedia'),
                                    score=0.9,  # Higher score for infobox results
                                ))
                        
            except aiohttp.ClientError as e:
                sys.stderr.write(f"SearXNG connection error: {e}\n")
            except Exception as e:
                sys.stderr.write(f"SearXNG search error: {e}\n")
        
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
