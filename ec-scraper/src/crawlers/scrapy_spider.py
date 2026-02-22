"""Scrapy spiders for opportunity discovery and crawling.

Provides fast, efficient crawling using Scrapy via subprocess execution.
"""

import asyncio
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import List, Optional

import scrapy
from scrapy.spiders import SitemapSpider
from scrapy.crawler import CrawlerProcess


class OpportunitySitemapSpider(SitemapSpider):
    name = 'opportunity_sitemap'

    opportunity_patterns = [
        r'/programs?/',
        r'/apply/',
        r'/scholarship/',
        r'/internship/',
        r'/competition/',
        r'/summer/',
        r'/opportunities/',
        r'/research/',
        r'/fellowships?/',
    ]

    exclude_patterns = [
        r'/wp-admin/',
        r'/feed/',
        r'/rss/',
        r'/category/',
        r'/tag/',
        r'/search/',
        r'\.(pdf|jpg|png|gif|zip)$',
    ]

    def __init__(self, sitemap_urls=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if sitemap_urls:
            if isinstance(sitemap_urls, str):
                sitemap_urls = json.loads(sitemap_urls)
            self.sitemap_urls = sitemap_urls

    def parse(self, response):
        for url in response.css('url loc::text').getall():
            if self._is_opportunity_url(url):
                yield {'url': url, 'source': 'sitemap'}

    def _is_opportunity_url(self, url: str) -> bool:
        url_lower = url.lower()

        for pattern in self.exclude_patterns:
            if re.search(pattern, url_lower):
                return False

        for pattern in self.opportunity_patterns:
            if re.search(pattern, url_lower):
                return True

        return False


class OpportunityCrawlerSpider(scrapy.Spider):
    name = 'opportunity_crawler'

    def __init__(self, urls=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if urls:
            if isinstance(urls, str):
                urls = json.loads(urls)
            self.start_urls = urls
        else:
            self.start_urls = []

    def parse(self, response):
        markdown = self._html_to_markdown(response)

        yield {
            'url': response.url,
            'markdown': markdown,
            'title': response.css('title::text').get(),
            'success': True,
        }

    def _html_to_markdown(self, response) -> str:
        try:
            import markdownify
            return markdownify.markdownify(
                response.text,
                heading_style="ATX",
                strip=['script', 'style']
            )
        except ImportError:
            text_blocks = []
            for p in response.css('p::text').getall():
                if p.strip():
                    text_blocks.append(p.strip())
            return '\n\n'.join(text_blocks)


class ScrapyRunner:
    """
    Bridge between Scrapy spiders and asyncio application.
    
    Uses subprocess to run Scrapy spiders (avoids asyncio/Twisted conflicts).
    """

    def __init__(self):
        self.python_exe = sys.executable

    async def run_sitemap_spider(
        self,
        sitemap_urls: List[str],
        max_urls: int = 100,
    ) -> List[str]:
        """
        Run sitemap spider via subprocess and return discovered URLs.

        Args:
            sitemap_urls: List of sitemap URLs to crawl
            max_urls: Maximum URLs to return

        Returns:
            List of discovered opportunity URLs
        """
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_file = f.name

        try:
            spider_file = Path(__file__).resolve()
            
            process = await asyncio.create_subprocess_exec(
                self.python_exe,
                str(spider_file),
                'sitemap',
                json.dumps(sitemap_urls),
                output_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"Scrapy failed: {stderr.decode()}")
            
            with open(output_file, 'r') as f:
                results = json.load(f)
            
            urls = [item['url'] for item in results[:max_urls]]
            return urls
            
        finally:
            Path(output_file).unlink(missing_ok=True)

    async def run_crawl_spider(
        self,
        urls: List[str],
    ) -> List[dict]:
        """
        Run crawl spider via subprocess and return extracted content.

        Args:
            urls: List of URLs to crawl

        Returns:
            List of crawl results with markdown content
        """
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            output_file = f.name

        try:
            spider_file = Path(__file__).resolve()
            
            process = await asyncio.create_subprocess_exec(
                self.python_exe,
                str(spider_file),
                'crawl',
                json.dumps(urls),
                output_file,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0:
                raise RuntimeError(f"Scrapy failed: {stderr.decode()}")
            
            with open(output_file, 'r') as f:
                results = json.load(f)
            
            return results
            
        finally:
            Path(output_file).unlink(missing_ok=True)


_runner_instance: Optional[ScrapyRunner] = None


def get_scrapy_runner() -> ScrapyRunner:
    global _runner_instance
    if _runner_instance is None:
        _runner_instance = ScrapyRunner()
    return _runner_instance


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: scrapy_spider.py <sitemap|crawl> <urls_json> <output_file>")
        sys.exit(1)
    
    mode = sys.argv[1]
    urls_json = sys.argv[2]
    output_file = sys.argv[3]
    
    process = CrawlerProcess(settings={
        'LOG_LEVEL': 'ERROR',
        'CONCURRENT_REQUESTS': 120 if mode == 'crawl' else 32,
        'DOWNLOAD_TIMEOUT': 15,
        'RETRY_ENABLED': True,
        'RETRY_TIMES': 3,
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'HTTPERROR_ALLOWED_CODES': [404],  # Allow 404s (soft-404s may have content)
        'FEEDS': {
            output_file: {
                'format': 'json',
                'overwrite': True,
            },
        },
    })
    
    if mode == 'sitemap':
        process.crawl(OpportunitySitemapSpider, sitemap_urls=urls_json)
    elif mode == 'crawl':
        process.crawl(OpportunityCrawlerSpider, urls=urls_json)
    else:
        print(f"Unknown mode: {mode}")
        sys.exit(1)
    
    process.start()
