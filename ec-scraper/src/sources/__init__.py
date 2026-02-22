"""Source discovery modules for EC opportunities."""

from .curated_sources import CURATED_SOURCES, get_all_curated_urls
from .sitemap_crawler import SitemapCrawler, get_sitemap_crawler

__all__ = [
    "CURATED_SOURCES",
    "get_all_curated_urls",
    "SitemapCrawler",
    "get_sitemap_crawler",
    # RSS monitoring removed - replaced with Scrapy sitemap discovery
]
