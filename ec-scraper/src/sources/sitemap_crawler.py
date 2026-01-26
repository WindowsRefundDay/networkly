"""Sitemap crawler for discovering opportunity pages from trusted domains."""

import asyncio
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import List, Optional, Set
from urllib.parse import urljoin, urlparse

import aiohttp


@dataclass
class SitemapURL:
    """A URL discovered from a sitemap."""
    
    url: str
    priority: float = 0.5
    changefreq: Optional[str] = None
    lastmod: Optional[str] = None


# URL patterns that typically indicate opportunity pages
OPPORTUNITY_PATTERNS = [
    r'/programs?/',
    r'/apply/',
    r'/application/',
    r'/scholarship/',
    r'/internship/',
    r'/competition/',
    r'/summer/',
    r'/opportunities/',
    r'/participate/',
    r'/join/',
    r'/register/',
    r'/events?/',
    r'/volunteer/',
    r'/research/',
    r'/fellowships?/',
]

# URL patterns to exclude (typically navigation/utility pages)
EXCLUDE_PATTERNS = [
    r'/wp-admin/',
    r'/wp-content/',
    r'/wp-includes/',
    r'/feed/',
    r'/rss/',
    r'/category/',
    r'/tag/',
    r'/author/',
    r'/archive/',
    r'/search/',
    r'/login',
    r'/logout',
    r'/register/',
    r'/cart/',
    r'/checkout/',
    r'/account/',
    r'/contact/',
    r'/about/',
    r'/privacy/',
    r'/terms/',
    r'/faq/',
    r'\.(pdf|jpg|jpeg|png|gif|svg|css|js|xml|json|zip)$',
]


class SitemapCrawler:
    """Crawler for extracting URLs from XML sitemaps."""
    
    def __init__(self, timeout: int = 30):
        """
        Initialize the sitemap crawler.
        
        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.opportunity_patterns = [re.compile(p, re.IGNORECASE) for p in OPPORTUNITY_PATTERNS]
        self.exclude_patterns = [re.compile(p, re.IGNORECASE) for p in EXCLUDE_PATTERNS]
    
    async def discover_sitemaps(self, base_url: str) -> List[str]:
        """
        Discover sitemap URLs for a domain.
        
        Checks common sitemap locations:
        - /sitemap.xml
        - /sitemap_index.xml
        - /robots.txt
        
        Args:
            base_url: Base URL of the domain
            
        Returns:
            List of discovered sitemap URLs
        """
        parsed = urlparse(base_url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        
        sitemap_urls = []
        
        # Check common sitemap locations
        common_locations = [
            f"{base}/sitemap.xml",
            f"{base}/sitemap_index.xml",
            f"{base}/sitemap-index.xml",
            f"{base}/post-sitemap.xml",
            f"{base}/page-sitemap.xml",
        ]
        
        async with aiohttp.ClientSession(timeout=self.timeout) as session:
            # Check robots.txt for sitemap declarations
            try:
                async with session.get(f"{base}/robots.txt") as response:
                    if response.status == 200:
                        text = await response.text()
                        for line in text.split('\n'):
                            if line.lower().startswith('sitemap:'):
                                sitemap_url = line.split(':', 1)[1].strip()
                                sitemap_urls.append(sitemap_url)
            except Exception:
                pass
            
            # Check common locations
            async def check_url(url):
                try:
                    async with session.head(url, allow_redirects=True) as response:
                        if response.status == 200:
                            return url
                except Exception:
                    pass
                return None

            results = await asyncio.gather(*(check_url(url) for url in common_locations))
            for url in results:
                if url:
                    sitemap_urls.append(url)
        
        return list(set(sitemap_urls))  # Remove duplicates
    
    async def fetch_sitemap(self, sitemap_url: str) -> Optional[str]:
        """
        Fetch sitemap XML content.
        
        Args:
            sitemap_url: URL of the sitemap
            
        Returns:
            XML content as string, or None if fetch failed
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(sitemap_url) as response:
                    if response.status == 200:
                        return await response.text()
        except Exception as e:
            import sys
            sys.stderr.write(f"Failed to fetch sitemap {sitemap_url}: {e}\n")
        return None
    
    def parse_sitemap(self, xml_content: str) -> List[SitemapURL]:
        """
        Parse sitemap XML and extract URLs.
        
        Args:
            xml_content: XML content as string
            
        Returns:
            List of SitemapURL objects
        """
        urls = []
        
        try:
            root = ET.fromstring(xml_content)
            
            # Handle sitemap index (contains references to other sitemaps)
            # We'll mark these for recursive processing
            ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
            
            # Check if this is a sitemap index
            sitemap_elements = root.findall('.//sm:sitemap', ns) or root.findall('.//sitemap')
            if sitemap_elements:
                # This is a sitemap index, extract sitemap URLs
                for sitemap in sitemap_elements:
                    loc = sitemap.find('sm:loc', ns) or sitemap.find('loc')
                    if loc is not None and loc.text:
                        # Mark as sitemap index URL (we'll handle recursion in the main method)
                        urls.append(SitemapURL(
                            url=loc.text.strip(),
                            priority=1.0,  # High priority for sitemaps
                        ))
            else:
                # This is a regular sitemap, extract page URLs
                url_elements = root.findall('.//sm:url', ns) or root.findall('.//url')
                for url_elem in url_elements:
                    loc = url_elem.find('sm:loc', ns) or url_elem.find('loc')
                    if loc is not None and loc.text:
                        priority_elem = url_elem.find('sm:priority', ns) or url_elem.find('priority')
                        changefreq_elem = url_elem.find('sm:changefreq', ns) or url_elem.find('changefreq')
                        lastmod_elem = url_elem.find('sm:lastmod', ns) or url_elem.find('lastmod')
                        
                        priority = 0.5
                        if priority_elem is not None and priority_elem.text:
                            try:
                                priority = float(priority_elem.text)
                            except ValueError:
                                pass
                        
                        urls.append(SitemapURL(
                            url=loc.text.strip(),
                            priority=priority,
                            changefreq=changefreq_elem.text if changefreq_elem is not None else None,
                            lastmod=lastmod_elem.text if lastmod_elem is not None else None,
                        ))
        
        except ET.ParseError as e:
            import sys
            sys.stderr.write(f"Failed to parse sitemap XML: {e}\n")
        
        return urls
    
    def is_opportunity_url(self, url: str) -> bool:
        """
        Check if a URL likely contains opportunity information.
        
        Args:
            url: URL to check
            
        Returns:
            True if URL matches opportunity patterns
        """
        # First check exclude patterns
        for pattern in self.exclude_patterns:
            if pattern.search(url):
                return False
        
        # Then check opportunity patterns
        for pattern in self.opportunity_patterns:
            if pattern.search(url):
                return True
        
        return False
    
    async def crawl_domain(
        self,
        base_url: str,
        filter_opportunities: bool = True,
        max_urls: int = 100,
    ) -> List[str]:
        """
        Crawl a domain's sitemaps and extract relevant URLs.
        
        Args:
            base_url: Base URL of the domain
            filter_opportunities: If True, only return URLs matching opportunity patterns
            max_urls: Maximum number of URLs to return
            
        Returns:
            List of discovered URLs
        """
        # Discover sitemaps
        sitemap_urls = await self.discover_sitemaps(base_url)
        if not sitemap_urls:
            return []
        
        all_urls: Set[str] = set()
        processed_sitemaps: Set[str] = set()
        sitemaps_to_process = list(sitemap_urls)
        
        # Process sitemaps (with recursion for sitemap indexes)
        while sitemaps_to_process and len(all_urls) < max_urls:
            sitemap_url = sitemaps_to_process.pop(0)
            
            if sitemap_url in processed_sitemaps:
                continue
            
            processed_sitemaps.add(sitemap_url)
            
            # Fetch and parse sitemap
            xml_content = await self.fetch_sitemap(sitemap_url)
            if not xml_content:
                continue
            
            sitemap_entries = self.parse_sitemap(xml_content)
            
            for entry in sitemap_entries:
                # Check if this is a nested sitemap
                if entry.url.endswith('.xml') and 'sitemap' in entry.url.lower():
                    if entry.url not in processed_sitemaps:
                        sitemaps_to_process.append(entry.url)
                else:
                    # Regular URL
                    if filter_opportunities:
                        if self.is_opportunity_url(entry.url):
                            all_urls.add(entry.url)
                    else:
                        all_urls.add(entry.url)
                
                # Stop if we've reached max_urls
                if len(all_urls) >= max_urls:
                    break
        
        return list(all_urls)[:max_urls]
    
    async def crawl_multiple_domains(
        self,
        base_urls: List[str],
        filter_opportunities: bool = True,
        max_urls_per_domain: int = 50,
    ) -> List[str]:
        """
        Crawl multiple domains in parallel.
        
        Args:
            base_urls: List of base URLs to crawl
            filter_opportunities: If True, only return URLs matching opportunity patterns
            max_urls_per_domain: Maximum URLs to extract per domain
            
        Returns:
            Combined list of discovered URLs from all domains
        """
        tasks = [
            self.crawl_domain(url, filter_opportunities, max_urls_per_domain)
            for url in base_urls
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_urls = []
        for result in results:
            if isinstance(result, list):
                all_urls.extend(result)
            # Silently skip exceptions
        
        return list(set(all_urls))  # Remove duplicates


# Singleton
_crawler_instance: Optional[SitemapCrawler] = None


def get_sitemap_crawler() -> SitemapCrawler:
    """Get the sitemap crawler singleton."""
    global _crawler_instance
    if _crawler_instance is None:
        _crawler_instance = SitemapCrawler()
    return _crawler_instance
