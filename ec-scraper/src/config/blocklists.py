"""Centralized domain blocklists for the EC scraper.

All blocklists are unified here to avoid fragmentation and ensure consistency.
"""

from typing import Set
from urllib.parse import urlparse


# Master blocklist - sites that never contain high school opportunities
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
    'linkedin.com',

    # Job boards (adult jobs, not HS programs)
    'indeed.com', 'glassdoor.com', 'ziprecruiter.com', 'monster.com',
    'careerbuilder.com', 'simplyhired.com', 'workday.com', 'lever.co',
    'greenhouse.io', 'hire.withgoogle.com', 'bamboohr.com',
    'smartrecruiters.com', 'ultipro.com', 'myworkdayjobs.com',
    'recruiting.ultipro.com',

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

# Domains that require JavaScript rendering (for hybrid crawler routing)
JS_HEAVY_DOMAINS: Set[str] = {
    "salesforce.com",
    # Note: Job boards are already blocked, but keep for reference
}

# Domains that need extra wait time for JS rendering
SLOW_RENDER_DOMAINS: Set[str] = {
    "salesforce.com",
}

# Pre-computed set for efficient O(1) lookups
_BLOCKED_DOMAINS_SET = frozenset(BLOCKED_DOMAINS)


def get_domain(url: str) -> str:
    """Extract normalized domain from URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except Exception:
        return ""


def is_blocked_domain(url: str) -> bool:
    """
    Check if a URL is from a blocked domain.
    
    Uses efficient set lookup with subdomain matching.
    """
    try:
        domain = get_domain(url)
        if not domain:
            return False

        # Exact match (O(1))
        if domain in _BLOCKED_DOMAINS_SET:
            return True

        # Subdomain match - check if domain ends with any blocked domain
        for blocked in _BLOCKED_DOMAINS_SET:
            if domain.endswith('.' + blocked):
                return True

        return False
    except Exception:
        return False


def is_js_heavy_domain(url: str) -> bool:
    """Check if a URL requires JavaScript rendering."""
    domain = get_domain(url)
    return any(js_domain in domain for js_domain in JS_HEAVY_DOMAINS)


def is_slow_render_domain(url: str) -> bool:
    """Check if a URL needs slower crawl config for JS rendering."""
    domain = get_domain(url)
    return any(slow in domain for slow in SLOW_RENDER_DOMAINS)
