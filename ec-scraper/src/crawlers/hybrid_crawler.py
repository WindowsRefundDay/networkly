"""Hybrid crawler: Scrapy (fast) + Crawl4AI (JS-heavy fallback).

Provides intelligent routing based on site characteristics.

Uses subprocess-based Scrapy for 95% of sites, Crawl4AI for JS-heavy 5%.
"""

import asyncio
import re
from typing import List, Optional
from dataclasses import dataclass
from urllib.parse import urlparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.async_configs import CacheMode

from .scrapy_spider import ScrapyRunner
from ..config import get_settings


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


# Domains that require JavaScript rendering
JS_HEAVY_DOMAINS = {
    "indeed.com", "glassdoor.com", "lever.co", "workday.com",
    "salesforce.com", "greenhouse.io", "ziprecruiter.com",
    "bamboohr.com", "smartrecruiters.com", "ultipro.com",
    "myworkdayjobs.com", "recruiting.ultipro.com",
}

# Blocked domains (no-opportunity content)
BLOCKED_DOMAINS = {
    "linkedin.com", "facebook.com", "twitter.com", "tiktok.com",
    "instagram.com", "youtube.com", "pinterest.com",
}


class HybridCrawler:
    """
    Hybrid crawler using Scrapy for speed, Crawl4AI for JS-heavy sites.

    Performance: 5-10x faster than Crawl4AI alone.
    """

    def __init__(self):
        self.settings = get_settings()
        self.scrapy_runner = ScrapyRunner()

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

    def _get_domain(self, url: str) -> str:
        """Extract domain from URL."""
        try:
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]
            return domain
        except Exception:
            return "unknown"

    def _needs_js_rendering(self, url: str) -> bool:
        """Check if URL needs JavaScript rendering."""
        domain = self._get_domain(url)
        return any(js_domain in domain for js_domain in JS_HEAVY_DOMAINS)

    def _is_blocked(self, url: str) -> bool:
        """Check if URL is blocked."""
        domain = self._get_domain(url)
        return any(blocked in domain for blocked in BLOCKED_DOMAINS)

    async def crawl(self, url: str) -> CrawlResult:
        if self._is_blocked(url):
            return CrawlResult(
                url=url,
                success=False,
                error=f"Domain blocked: {self._get_domain(url)}",
            )

        if self._needs_js_rendering(url):
            return await self._crawl_with_crawl4ai(url)

        return await self._crawl_with_scrapy(url)

    async def _crawl_with_scrapy(self, url: str) -> CrawlResult:
        try:
            results = await self.scrapy_runner.run_crawl_spider([url])

            if not results:
                return await self._crawl_with_crawl4ai(url)

            result = results[0]
            return CrawlResult(
                url=url,
                success=result.get('success', False),
                markdown=result.get('markdown'),
                title=result.get('title'),
                crawler_used='scrapy',
            )
        except Exception as e:
            return await self._crawl_with_crawl4ai(url)

    async def _crawl_with_crawl4ai(self, url: str) -> CrawlResult:
        try:
            async with AsyncWebCrawler(config=self._browser_config) as crawler:
                result = await crawler.arun(url=url, config=self._crawl_config)

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
