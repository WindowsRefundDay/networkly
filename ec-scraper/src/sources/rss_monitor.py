"""RSS feed monitor for real-time opportunity discovery."""

import asyncio
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse

import aiohttp


@dataclass
class RSSItem:
    """An item from an RSS feed."""
    
    title: str
    link: str
    description: str = ""
    pub_date: Optional[datetime] = None
    source_feed: str = ""


# Curated RSS feeds for opportunity discovery
RSS_FEEDS = [
    # Scholarship aggregators
    "https://www.scholarships.com/feed/",
    "https://www.fastweb.com/rss/",
    
    # Government opportunities
    "https://www.usa.gov/rss/updates.xml",
    
    # STEM organizations (many have RSS feeds)
    "https://www.sciencenews.org/feeds/headlines",
    
    # Educational news
    "https://www.insidehighered.com/rss/feed",
    "https://www.chronicle.com/rss",
    
    # Teen/Youth opportunity aggregators
    "https://www.teenlife.com/feed/",
    
    # Note: Many sites don't have RSS feeds anymore, but we can
    # still check these and add more as discovered
]


class RSSMonitor:
    """Monitor RSS feeds for new opportunity announcements."""
    
    def __init__(self, timeout: int = 30):
        """
        Initialize the RSS monitor.
        
        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.feeds = RSS_FEEDS.copy()
    
    def add_feed(self, feed_url: str):
        """
        Add a new feed to monitor.
        
        Args:
            feed_url: URL of the RSS/Atom feed
        """
        if feed_url not in self.feeds:
            self.feeds.append(feed_url)
    
    async def fetch_feed(self, feed_url: str) -> Optional[str]:
        """
        Fetch RSS feed content.
        
        Args:
            feed_url: URL of the feed
            
        Returns:
            XML content as string, or None if fetch failed
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(feed_url) as response:
                    if response.status == 200:
                        return await response.text()
        except Exception as e:
            import sys
            sys.stderr.write(f"Failed to fetch feed {feed_url}: {e}\n")
        return None
    
    def parse_rss(self, xml_content: str, feed_url: str) -> List[RSSItem]:
        """
        Parse RSS/Atom feed and extract items.
        
        Args:
            xml_content: XML content as string
            feed_url: Source feed URL (for attribution)
            
        Returns:
            List of RSSItem objects
        """
        items = []
        
        try:
            root = ET.fromstring(xml_content)
            
            # Handle RSS 2.0
            if root.tag == 'rss' or 'rss' in root.tag.lower():
                channel = root.find('channel')
                if channel is not None:
                    for item_elem in channel.findall('item'):
                        items.append(self._parse_rss_item(item_elem, feed_url))
            
            # Handle Atom feeds
            elif 'atom' in root.tag.lower() or root.tag == '{http://www.w3.org/2005/Atom}feed':
                for entry in root.findall('.//{http://www.w3.org/2005/Atom}entry') or root.findall('.//entry'):
                    items.append(self._parse_atom_entry(entry, feed_url))
        
        except ET.ParseError as e:
            import sys
            sys.stderr.write(f"Failed to parse feed XML: {e}\n")
        
        return items
    
    def _parse_rss_item(self, item_elem, feed_url: str) -> RSSItem:
        """Parse an RSS <item> element."""
        title_elem = item_elem.find('title')
        link_elem = item_elem.find('link')
        desc_elem = item_elem.find('description')
        pub_date_elem = item_elem.find('pubDate')
        
        title = title_elem.text if title_elem is not None and title_elem.text else "Untitled"
        link = link_elem.text if link_elem is not None and link_elem.text else ""
        description = desc_elem.text if desc_elem is not None and desc_elem.text else ""
        
        pub_date = None
        if pub_date_elem is not None and pub_date_elem.text:
            pub_date = self._parse_date(pub_date_elem.text)
        
        return RSSItem(
            title=title,
            link=link,
            description=description,
            pub_date=pub_date,
            source_feed=feed_url,
        )
    
    def _parse_atom_entry(self, entry_elem, feed_url: str) -> RSSItem:
        """Parse an Atom <entry> element."""
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        title_elem = entry_elem.find('atom:title', ns) or entry_elem.find('title')
        link_elem = entry_elem.find('atom:link', ns) or entry_elem.find('link')
        summary_elem = entry_elem.find('atom:summary', ns) or entry_elem.find('summary')
        updated_elem = entry_elem.find('atom:updated', ns) or entry_elem.find('updated')
        
        title = title_elem.text if title_elem is not None and title_elem.text else "Untitled"
        
        link = ""
        if link_elem is not None:
            if link_elem.text:
                link = link_elem.text
            elif 'href' in link_elem.attrib:
                link = link_elem.attrib['href']
        
        description = summary_elem.text if summary_elem is not None and summary_elem.text else ""
        
        pub_date = None
        if updated_elem is not None and updated_elem.text:
            pub_date = self._parse_date(updated_elem.text)
        
        return RSSItem(
            title=title,
            link=link,
            description=description,
            pub_date=pub_date,
            source_feed=feed_url,
        )
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse RSS/Atom date strings."""
        # Try multiple date formats
        formats = [
            "%a, %d %b %Y %H:%M:%S %z",  # RSS 2.0
            "%a, %d %b %Y %H:%M:%S %Z",
            "%Y-%m-%dT%H:%M:%S%z",        # ISO 8601 with timezone
            "%Y-%m-%dT%H:%M:%SZ",         # ISO 8601 UTC
            "%Y-%m-%dT%H:%M:%S",          # ISO 8601 without timezone
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return None
    
    def filter_opportunity_items(self, items: List[RSSItem]) -> List[RSSItem]:
        """
        Filter RSS items to only include opportunity-related content.
        
        Args:
            items: List of RSS items
            
        Returns:
            Filtered list of items likely to contain opportunities
        """
        opportunity_keywords = [
            'scholarship', 'internship', 'competition', 'program',
            'opportunity', 'fellowship', 'award', 'grant',
            'contest', 'apply', 'application', 'deadline',
            'student', 'teen', 'youth', 'high school',
        ]
        
        filtered = []
        for item in items:
            text_to_check = f"{item.title} {item.description}".lower()
            if any(keyword in text_to_check for keyword in opportunity_keywords):
                filtered.append(item)
        
        return filtered
    
    async def fetch_all_feeds(
        self,
        filter_opportunities: bool = True,
        max_age_days: Optional[int] = 30,
    ) -> List[RSSItem]:
        """
        Fetch and parse all monitored RSS feeds.
        
        Args:
            filter_opportunities: If True, only return items likely to contain opportunities
            max_age_days: Only return items newer than this many days (None for all)
            
        Returns:
            Combined list of RSS items from all feeds
        """
        tasks = [self.fetch_feed(feed_url) for feed_url in self.feeds]
        feed_contents = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_items = []
        for feed_url, content in zip(self.feeds, feed_contents):
            if isinstance(content, str):
                items = self.parse_rss(content, feed_url)
                all_items.extend(items)
        
        # Filter by age if specified
        if max_age_days is not None:
            cutoff = datetime.utcnow()
            cutoff = cutoff.replace(day=cutoff.day - max_age_days)
            all_items = [
                item for item in all_items
                if item.pub_date is None or item.pub_date >= cutoff
            ]
        
        # Filter for opportunities if requested
        if filter_opportunities:
            all_items = self.filter_opportunity_items(all_items)
        
        # Sort by publication date (newest first)
        all_items.sort(
            key=lambda x: x.pub_date if x.pub_date else datetime.min,
            reverse=True
        )
        
        return all_items
    
    async def get_urls(
        self,
        filter_opportunities: bool = True,
        max_age_days: Optional[int] = 30,
    ) -> List[str]:
        """
        Get URLs from all RSS feeds.
        
        Args:
            filter_opportunities: If True, only return URLs from opportunity-related items
            max_age_days: Only return URLs from items newer than this many days
            
        Returns:
            List of URLs from RSS feed items
        """
        items = await self.fetch_all_feeds(filter_opportunities, max_age_days)
        urls = [item.link for item in items if item.link]
        return list(set(urls))  # Remove duplicates


# Singleton
_monitor_instance: Optional[RSSMonitor] = None


def get_rss_monitor() -> RSSMonitor:
    """Get the RSS monitor singleton."""
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = RSSMonitor()
    return _monitor_instance
