"""DuckDuckGo search client with multi-layer fallback.

Layer 1: ddgs library (CAPTCHA-proof, preferred)
Layer 2: DuckDuckGo HTML API via httpx (fallback if ddgs unavailable)
"""

import asyncio
import re
import sys
from dataclasses import dataclass
from typing import List, Optional
from urllib.parse import unquote, urlparse, parse_qs

# Try importing ddgs — it may not be installed
_DDGS_AVAILABLE = False
try:
    from ddgs import DDGS
    _DDGS_AVAILABLE = True
except ImportError:
    sys.stderr.write(
        "[DuckDuckGo] WARNING: ddgs library not installed. "
        "Install with: pip install ddgs\n"
        "[DuckDuckGo] Falling back to httpx HTML search.\n"
    )

# httpx is always available (in pyproject.toml)
import httpx


@dataclass
class SearchResult:
    """A single search result."""
    url: str
    title: str
    snippet: str
    engine: str = "duckduckgo"
    score: float = 0.5


class DuckDuckGoClient:
    """DuckDuckGo search client with automatic fallback.

    Tries ddgs library first (reliable, handles anti-bot).
    Falls back to direct HTTP search if ddgs is unavailable or fails.
    """

    def __init__(self):
        self._ddgs_broken = not _DDGS_AVAILABLE
        self._ddgs_fail_count = 0

    async def search(self, query: str, max_results: int = 20) -> List[SearchResult]:
        """Search DuckDuckGo with automatic fallback."""
        # Layer 1: ddgs library
        if not self._ddgs_broken:
            results = await self._search_ddgs(query, max_results)
            if results is not None:
                return results
            # ddgs failed — increment counter and maybe mark broken
            self._ddgs_fail_count += 1
            if self._ddgs_fail_count >= 3:
                self._ddgs_broken = True
                sys.stderr.write(
                    "[DuckDuckGo] ddgs failed 3 times — switching to httpx fallback permanently\n"
                )

        # Layer 2: httpx HTML search
        results = await self._search_httpx(query, max_results)
        return results

    async def _search_ddgs(self, query: str, max_results: int) -> Optional[List[SearchResult]]:
        """Search using ddgs library. Returns None on failure."""
        try:
            def _sync_search():
                with DDGS() as ddgs:
                    return list(ddgs.text(query, max_results=max_results))

            raw_results = await asyncio.wait_for(
                asyncio.to_thread(_sync_search),
                timeout=15,
            )

            results = []
            for item in raw_results:
                href = item.get("href", "")
                title = item.get("title", "")
                snippet = item.get("body", "")

                if not href or not href.startswith("http"):
                    continue
                if "duckduckgo.com" in href:
                    continue

                results.append(SearchResult(
                    url=href, title=title, snippet=snippet,
                    engine="duckduckgo", score=0.5,
                ))

            sys.stderr.write(f"[DuckDuckGo/ddgs] Found {len(results)} results for: {query[:50]}\n")
            self._ddgs_fail_count = 0  # Reset on success
            return results

        except asyncio.TimeoutError:
            sys.stderr.write(f"[DuckDuckGo/ddgs] Timeout (15s) for: {query[:50]}\n")
            return None
        except Exception as e:
            sys.stderr.write(f"[DuckDuckGo/ddgs] Failed: {type(e).__name__}: {str(e)[:100]}\n")
            return None

    async def _search_httpx(self, query: str, max_results: int) -> List[SearchResult]:
        """Fallback: search DuckDuckGo via HTML API using httpx."""
        results = []
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(15.0),
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
            ) as client:
                resp = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                )
                resp.raise_for_status()
                html = resp.text

                # Parse results from DDG HTML response
                # Each result is in a <div class="result"> with <a class="result__a"> for title/url
                # and <a class="result__snippet"> for snippet
                result_blocks = re.findall(
                    r'<div[^>]*class="[^"]*result\b[^"]*"[^>]*>(.*?)</div>\s*</div>',
                    html, re.DOTALL
                )

                for block in result_blocks[:max_results]:
                    # Extract URL from result__a href
                    url_match = re.search(
                        r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
                        block, re.DOTALL
                    )
                    if not url_match:
                        continue

                    raw_url = url_match.group(1)
                    title_html = url_match.group(2)

                    # DDG wraps URLs in a redirect — extract the real URL
                    real_url = self._extract_ddg_url(raw_url)
                    if not real_url or not real_url.startswith("http"):
                        continue
                    if "duckduckgo.com" in real_url:
                        continue

                    # Clean HTML tags from title
                    title = re.sub(r'<[^>]+>', '', title_html).strip()

                    # Extract snippet
                    snippet = ""
                    snippet_match = re.search(
                        r'<a[^>]*class="result__snippet"[^>]*>(.*?)</a>',
                        block, re.DOTALL
                    )
                    if snippet_match:
                        snippet = re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip()

                    results.append(SearchResult(
                        url=real_url, title=title, snippet=snippet,
                        engine="duckduckgo-html", score=0.4,
                    ))

            sys.stderr.write(f"[DuckDuckGo/httpx] Found {len(results)} results for: {query[:50]}\n")

        except Exception as e:
            sys.stderr.write(f"[DuckDuckGo/httpx] Failed: {type(e).__name__}: {str(e)[:100]}\n")

        return results

    @staticmethod
    def _extract_ddg_url(raw_url: str) -> str:
        """Extract real URL from DuckDuckGo redirect wrapper."""
        if "duckduckgo.com" in raw_url and "uddg=" in raw_url:
            parsed = parse_qs(urlparse(raw_url).query)
            uddg = parsed.get("uddg", [None])[0]
            if uddg:
                return unquote(uddg)
        # Not a redirect — return as-is
        return unquote(raw_url)


# Singleton
_ddg_client_instance = None


def get_duckduckgo_client() -> DuckDuckGoClient:
    """Get the DuckDuckGo client singleton."""
    global _ddg_client_instance
    if _ddg_client_instance is None:
        _ddg_client_instance = DuckDuckGoClient()
    return _ddg_client_instance
