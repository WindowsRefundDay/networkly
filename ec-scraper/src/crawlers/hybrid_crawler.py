"""Hybrid crawler: Scrapy (fast) + Crawl4AI (JS-heavy fallback).

Provides intelligent routing based on site characteristics.

Uses subprocess-based Scrapy for 95% of sites, Crawl4AI for JS-heavy 5%.
"""

import asyncio
import re
from typing import List, Optional
from dataclasses import dataclass

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.async_configs import CacheMode

from .scrapy_spider import ScrapyRunner
from ..config import get_settings, is_blocked_domain, is_js_heavy_domain, get_domain
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
    crawler_used: Optional[str] = None  # 'scrapy' or 'crawl4ai'


class HybridCrawler:
    """
    Hybrid crawler using Scrapy for speed, Crawl4AI for JS-heavy sites.

    Performance: 5-10x faster than Crawl4AI alone.
    """

    def __init__(self):
        self.settings = get_settings()
        self.scrapy_runner = ScrapyRunner()
        self._crawl_timeout = self.settings.crawl_timeout_seconds

        self._browser_config = BrowserConfig(
            headless=True,
            verbose=False,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        )
        self._crawl_config = CrawlerRunConfig(
            word_count_threshold=0,
            remove_overlay_elements=True,
            cache_mode=CacheMode.BYPASS,
            wait_until="domcontentloaded",
            page_timeout=15000,
            delay_before_return_html=1.0,
        )

    async def crawl(self, url: str) -> CrawlResult:
        """Crawl a URL with automatic routing and retry logic."""
        # Use centralized blocklist check
        if is_blocked_domain(url):
            return CrawlResult(
                url=url,
                success=False,
                error=f"Domain blocked: {get_domain(url)}",
            )

        # Use centralized JS-heavy check
        if is_js_heavy_domain(url):
            return await self._crawl_with_crawl4ai(url)

        return await self._crawl_with_scrapy(url)

    async def _crawl_with_scrapy(self, url: str) -> CrawlResult:
        """Crawl with Scrapy, falling back to Crawl4AI on failure."""
        async def do_scrapy_crawl():
            results = await asyncio.wait_for(
                self.scrapy_runner.run_crawl_spider([url]),
                timeout=self._crawl_timeout
            )
            if not results:
                raise ValueError("No results from Scrapy")
            return results[0]
        
        try:
            result = await retry_async(
                do_scrapy_crawl,
                config=CRAWL_RETRY_CONFIG,
                operation_name=f"Scrapy crawl {get_domain(url)}",
            )
            return CrawlResult(
                url=url,
                success=result.get('success', False),
                markdown=result.get('markdown'),
                title=result.get('title'),
                crawler_used='scrapy',
            )
        except Exception:
            # Fallback to Crawl4AI
            return await self._crawl_with_crawl4ai(url)

    async def _crawl_with_crawl4ai(self, url: str) -> CrawlResult:
        """Crawl with Crawl4AI (browser-based) with retry logic."""
        async def do_crawl4ai():
            async with AsyncWebCrawler(config=self._browser_config) as crawler:
                return await crawler.arun(url=url, config=self._crawl_config)
        
        try:
            result = await asyncio.wait_for(
                retry_async(
                    do_crawl4ai,
                    config=CRAWL_RETRY_CONFIG,
                    operation_name=f"Crawl4AI {get_domain(url)}",
                ),
                timeout=self._crawl_timeout
            )

            if result.success:
                markdown = self._clean_markdown(result.markdown or "")
                return CrawlResult(
                    url=url,
                    success=True,
                    markdown=markdown,
                    html=result.html,
                    title=result.metadata.get("title") if result.metadata else None,
                    crawler_used='crawl4ai',
                )
            else:
                return CrawlResult(
                    url=url,
                    success=False,
                    error=result.error_message or "Crawl4AI failed",
                    crawler_used='crawl4ai',
                )
        except asyncio.TimeoutError:
            return CrawlResult(
                url=url,
                success=False,
                error=f"Crawl timed out after {self._crawl_timeout}s",
                crawler_used='crawl4ai',
            )
        except Exception as e:
            return CrawlResult(
                url=url,
                success=False,
                error=str(e)[:100],
                crawler_used='crawl4ai',
            )

    def _clean_markdown(self, markdown: str) -> str:
        if not markdown:
            return ""

        # Remove excessive whitespace
        markdown = re.sub(r'\n{3,}', '\n\n', markdown)

        # Remove empty lines
        lines = [line for line in markdown.split('\n') if line.strip()]
        markdown = '\n'.join(lines)

        return markdown.strip()

    async def crawl_batch(
        self,
        urls: List[str],
        max_concurrent: int = 50,
    ) -> List[CrawlResult]:
        """
        Crawl multiple URLs in parallel.

        Args:
            urls: List of URLs to crawl
            max_concurrent: Max concurrent crawls

        Returns:
            List of CrawlResults
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def crawl_with_semaphore(url: str) -> CrawlResult:
            async with semaphore:
                return await self.crawl(url)

        tasks = [crawl_with_semaphore(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

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
_crawler_instance: Optional[HybridCrawler] = None


def get_hybrid_crawler() -> HybridCrawler:
    """Get hybrid crawler singleton."""
    global _crawler_instance
    if _crawler_instance is None:
        _crawler_instance = HybridCrawler()
    return _crawler_instance
