"""Crawl4AI client for web scraping with improved content extraction and performance."""

import asyncio
import re
from typing import Optional, List
from dataclasses import dataclass

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.async_configs import CacheMode

from ..config import get_settings, is_blocked_domain, is_slow_render_domain, get_domain
from ..utils.retry import retry_async, CRAWL_RETRY_CONFIG


@dataclass
class CrawlResult:
    """Result from crawling a URL."""

    url: str
    success: bool
    markdown: Optional[str] = None
    html: Optional[str] = None
    title: Optional[str] = None
    error: Optional[str] = None


class Crawl4AIClient:
    """Async web crawler using Crawl4AI with improved content extraction and performance."""

    def __init__(self):
        """Initialize the crawler."""
        self.settings = get_settings()
        self._browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        
        # Fast config for most sites - prioritize speed
        self._crawl_config = CrawlerRunConfig(
            word_count_threshold=0,
            remove_overlay_elements=True,
            cache_mode=CacheMode.BYPASS,
            wait_until="domcontentloaded",  # Fast - don't wait for all resources
            page_timeout=10000,  # 10 second timeout (was 20s)
            delay_before_return_html=0.3,  # 0.3s wait (was 0.5s)
            verbose=False,
        )
        
        # Slower config for JS-heavy sites
        self._slow_crawl_config = CrawlerRunConfig(
            word_count_threshold=0,
            remove_overlay_elements=True,
            cache_mode=CacheMode.BYPASS,
            wait_until="domcontentloaded",  # Still use domcontentloaded for speed
            page_timeout=15000,  # 15 second timeout (was 30s)
            delay_before_return_html=1.0,  # 1s wait (was 2s)
            verbose=False,
        )
        
        # Global timeout from settings
        self._global_timeout = self.settings.crawl_timeout_seconds

    async def crawl(self, url: str) -> CrawlResult:
        """
        Crawl a single URL with retry logic and global timeout protection.
        
        Args:
            url: The URL to crawl
            
        Returns:
            CrawlResult with markdown content or error
        """
        # Check for blocked domains first using centralized blocklist (fast fail)
        if is_blocked_domain(url):
            return CrawlResult(
                url=url,
                success=False,
                error=f"Domain blocked: {get_domain(url)}",
            )

        # Choose config based on domain using centralized check
        config = self._slow_crawl_config if is_slow_render_domain(url) else self._crawl_config
        
        # Wrap in global timeout to prevent hanging
        try:
            return await asyncio.wait_for(
                self._do_crawl_with_retry(url, config),
                timeout=self._global_timeout
            )
        except asyncio.TimeoutError:
            return CrawlResult(
                url=url,
                success=False,
                error=f"Crawl timed out after {self._global_timeout}s",
            )

    async def _do_crawl_with_retry(self, url: str, config: CrawlerRunConfig) -> CrawlResult:
        """Perform the actual crawl with retry logic."""
        async def do_crawl():
            async with AsyncWebCrawler(config=self._browser_config) as crawler:
                return await crawler.arun(url=url, config=config)
        
        try:
            result = await retry_async(
                do_crawl,
                config=CRAWL_RETRY_CONFIG,
                operation_name=f"Crawl4AI {get_domain(url)}",
            )

            if result.success:
                markdown = result.markdown or ""
                markdown = self._clean_markdown(markdown)
                
                return CrawlResult(
                    url=url,
                    success=True,
                    markdown=markdown,
                    html=result.html,
                    title=result.metadata.get("title") if result.metadata else None,
                )
            else:
                return CrawlResult(
                    url=url,
                    success=False,
                    error=result.error_message or "Unknown crawl error",
                )

        except asyncio.TimeoutError:
            return CrawlResult(
                url=url,
                success=False,
                error="Page load timed out",
            )
        except Exception as e:
            return CrawlResult(
                url=url,
                success=False,
                error=str(e)[:100],  # Truncate long errors
            )

    def _clean_markdown(self, markdown: str) -> str:
        """Clean up extracted markdown content."""
        if not markdown:
            return ""
        
        # Remove excessive newlines
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)
        
        # Remove lines that are just whitespace
        lines = [line for line in markdown.split('\n') if line.strip() or line == '']
        markdown = '\n'.join(lines)
        
        # Remove common noise patterns
        noise_patterns = [
            r'^\s*Skip to .*$',
            r'^\s*Cookie.*$',
            r'^\s*Accept.*cookies.*$',
            r'^\s*Privacy Policy.*$',
            r'^\s*Terms of Service.*$',
            r'^\s*\[.*\]\(javascript:.*\).*$',
        ]
        for pattern in noise_patterns:
            markdown = re.sub(pattern, '', markdown, flags=re.MULTILINE | re.IGNORECASE)
        
        return markdown.strip()

    async def crawl_batch(
        self,
        urls: List[str],
        max_concurrent: int = 4,
    ) -> List[CrawlResult]:
        """
        Crawl multiple URLs concurrently with semaphore limiting.
        
        Args:
            urls: List of URLs to crawl
            max_concurrent: Max concurrent crawls (default 4)
            
        Returns:
            List of CrawlResults in same order as input URLs
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def crawl_with_semaphore(url: str) -> CrawlResult:
            async with semaphore:
                return await self.crawl(url)

        tasks = [crawl_with_semaphore(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to CrawlResults
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append(CrawlResult(
                    url=urls[i],
                    success=False,
                    error=str(result)[:100],
                ))
            else:
                final_results.append(result)

        return final_results


# Singleton
_crawler_instance: Optional[Crawl4AIClient] = None


def get_crawler() -> Crawl4AIClient:
    """Get the crawler singleton."""
    global _crawler_instance
    if _crawler_instance is None:
        _crawler_instance = Crawl4AIClient()
    return _crawler_instance
