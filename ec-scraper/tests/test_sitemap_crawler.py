import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from src.sources.sitemap_crawler import SitemapCrawler

@pytest.fixture
def crawler():
    return SitemapCrawler()

class MockResponse:
    def __init__(self, text="", status=200):
        self._text = text
        self.status = status

    async def text(self):
        return self._text

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        pass

@pytest.mark.asyncio
async def test_discover_sitemaps_robots_txt(crawler):
    """Test discovering sitemaps from robots.txt."""
    base_url = "https://example.com"
    robots_txt = "User-agent: *\nSitemap: https://example.com/sitemap_from_robots.xml"

    mock_session = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    # Configure get response for robots.txt
    def side_effect_get(url, **kwargs):
        if url == f"{base_url}/robots.txt":
            return MockResponse(text=robots_txt, status=200)
        return MockResponse(status=404)

    # Configure head response (fail all common locations for this test)
    def side_effect_head(url, **kwargs):
        return MockResponse(status=404)

    mock_session.get.side_effect = side_effect_get
    mock_session.head.side_effect = side_effect_head

    with patch('aiohttp.ClientSession', return_value=mock_session):
        sitemaps = await crawler.discover_sitemaps(base_url)

    assert "https://example.com/sitemap_from_robots.xml" in sitemaps
    assert len(sitemaps) == 1

@pytest.mark.asyncio
async def test_discover_sitemaps_common_locations(crawler):
    """Test discovering sitemaps from common locations."""
    base_url = "https://example.com"

    mock_session = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    # Configure get response for robots.txt (empty/404)
    def side_effect_get(url, **kwargs):
        return MockResponse(status=404)

    # Configure head response (succeed for one common location)
    def side_effect_head(url, **kwargs):
        if url == f"{base_url}/sitemap.xml":
            return MockResponse(status=200)
        return MockResponse(status=404)

    mock_session.get.side_effect = side_effect_get
    mock_session.head.side_effect = side_effect_head

    with patch('aiohttp.ClientSession', return_value=mock_session):
        sitemaps = await crawler.discover_sitemaps(base_url)

    assert f"{base_url}/sitemap.xml" in sitemaps
    assert len(sitemaps) == 1

@pytest.mark.asyncio
async def test_discover_sitemaps_parallel_execution(crawler):
    """Test that sitemaps discovery handles multiple findings and deduplication."""
    base_url = "https://example.com"
    robots_txt = "Sitemap: https://example.com/sitemap.xml" # Duplicate of common location

    mock_session = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    def side_effect_get(url, **kwargs):
        if url == f"{base_url}/robots.txt":
            return MockResponse(text=robots_txt, status=200)
        return MockResponse(status=404)

    def side_effect_head(url, **kwargs):
        # Allow sitemap.xml (duplicate) and another one
        if url == f"{base_url}/sitemap.xml":
            return MockResponse(status=200)
        if url == f"{base_url}/sitemap_index.xml":
            return MockResponse(status=200)
        return MockResponse(status=404)

    mock_session.get.side_effect = side_effect_get
    mock_session.head.side_effect = side_effect_head

    with patch('aiohttp.ClientSession', return_value=mock_session):
        sitemaps = await crawler.discover_sitemaps(base_url)

    assert f"{base_url}/sitemap.xml" in sitemaps
    assert f"{base_url}/sitemap_index.xml" in sitemaps
    assert len(sitemaps) == 2 # Should be unique

@pytest.mark.asyncio
async def test_discover_sitemaps_error_handling(crawler):
    """Test error handling during discovery."""
    base_url = "https://example.com"

    mock_session = MagicMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock()

    # Robots.txt check raises exception
    def side_effect_get(url, **kwargs):
        raise Exception("Connection error")

    # Some common locations raise exception, one succeeds
    def side_effect_head(url, **kwargs):
        if url == f"{base_url}/sitemap.xml":
            return MockResponse(status=200)
        raise Exception("Connection error")

    mock_session.get.side_effect = side_effect_get
    mock_session.head.side_effect = side_effect_head

    with patch('aiohttp.ClientSession', return_value=mock_session):
        sitemaps = await crawler.discover_sitemaps(base_url)

    assert f"{base_url}/sitemap.xml" in sitemaps
    assert len(sitemaps) == 1
