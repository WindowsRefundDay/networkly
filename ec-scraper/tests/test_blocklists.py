"""Tests for blocklist utilities."""

import pytest
from src.config.blocklists import (
    get_domain,
    is_blocked_domain,
    is_js_heavy_domain,
    is_slow_render_domain,
    BLOCKED_DOMAINS,
    JS_HEAVY_DOMAINS,
    SLOW_RENDER_DOMAINS,
)


class TestGetDomain:
    """Tests for domain extraction from URLs."""

    def test_extracts_simple_domain(self):
        """Test extracting domain from simple URL."""
        assert get_domain("https://example.com/path") == "example.com"

    def test_removes_www_prefix(self):
        """Test that www. prefix is removed."""
        assert get_domain("https://www.example.com") == "example.com"

    def test_handles_subdomain(self):
        """Test handling subdomains correctly."""
        assert get_domain("https://blog.example.com") == "blog.example.com"

    def test_handles_multiple_subdomains(self):
        """Test handling multiple subdomains."""
        assert get_domain("https://a.b.c.example.com") == "a.b.c.example.com"

    def test_lowercases_domain(self):
        """Test that domain is lowercased."""
        assert get_domain("https://EXAMPLE.COM") == "example.com"
        assert get_domain("https://Example.Com") == "example.com"

    def test_handles_port(self):
        """Test handling URLs with ports."""
        assert get_domain("https://example.com:8080/path") == "example.com:8080"

    def test_handles_query_params(self):
        """Test handling URLs with query parameters."""
        assert get_domain("https://example.com/path?query=1") == "example.com"

    def test_handles_fragment(self):
        """Test handling URLs with fragments."""
        assert get_domain("https://example.com/path#section") == "example.com"

    def test_handles_http(self):
        """Test handling HTTP URLs."""
        assert get_domain("http://example.com") == "example.com"

    def test_handles_no_scheme(self):
        """Test handling URLs without scheme - returns empty due to parse failure."""
        # urlparse requires scheme for proper parsing
        result = get_domain("example.com/path")
        assert result == ""  # No netloc without scheme

    def test_returns_empty_for_invalid(self):
        """Test returning empty string for invalid URLs."""
        assert get_domain("not-a-url") == ""
        assert get_domain("") == ""

    def test_handles_special_characters(self):
        """Test handling URLs with special characters."""
        assert get_domain("https://example.com/path%20with%20spaces") == "example.com"


class TestIsBlockedDomain:
    """Tests for blocked domain checking."""

    def test_blocks_exact_match(self):
        """Test blocking exact domain match."""
        # Pick a domain we know is in the blocklist
        assert is_blocked_domain("https://reddit.com/r/test") is True
        assert is_blocked_domain("https://facebook.com") is True

    def test_blocks_subdomain(self):
        """Test blocking subdomains of blocked domains."""
        assert is_blocked_domain("https://old.reddit.com/r/test") is True
        assert is_blocked_domain("https://m.facebook.com") is True

    def test_allows_unblocked_domain(self):
        """Test allowing unblocked domains."""
        assert is_blocked_domain("https://nasa.gov") is False
        assert is_blocked_domain("https://scienceolympiad.org") is False

    def test_allows_domain_with_blocked_substring(self):
        """Test that domains containing blocked domain as substring are allowed."""
        # e.g., "notreddit.com" should NOT be blocked just because it contains "reddit"
        assert is_blocked_domain("https://notreddit.example.com") is False

    def test_handles_www_prefix(self):
        """Test that www prefix is handled correctly."""
        assert is_blocked_domain("https://www.reddit.com") is True
        assert is_blocked_domain("https://www.nasa.gov") is False

    def test_handles_invalid_url(self):
        """Test handling invalid URLs gracefully."""
        assert is_blocked_domain("not-a-url") is False
        assert is_blocked_domain("") is False

    def test_handles_edge_cases(self):
        """Test edge cases in URL handling."""
        assert is_blocked_domain("https://") is False
        assert is_blocked_domain("://broken") is False

    def test_blocks_chinese_sites(self):
        """Test blocking Chinese/Asian language sites."""
        assert is_blocked_domain("https://zhihu.com/question/123") is True
        assert is_blocked_domain("https://baidu.com/s?wd=test") is True

    def test_blocks_job_boards(self):
        """Test blocking adult job boards."""
        assert is_blocked_domain("https://indeed.com/jobs") is True
        assert is_blocked_domain("https://glassdoor.com/reviews") is True

    def test_blocks_social_media(self):
        """Test blocking social media platforms."""
        assert is_blocked_domain("https://twitter.com/user") is True
        assert is_blocked_domain("https://instagram.com/p/abc") is True
        assert is_blocked_domain("https://youtube.com/watch?v=xyz") is True

    def test_blocks_shopping_sites(self):
        """Test blocking shopping sites."""
        assert is_blocked_domain("https://amazon.com/dp/product") is True
        assert is_blocked_domain("https://ebay.com/itm/item") is True

    def test_blocks_reference_sites(self):
        """Test blocking reference/dictionary sites."""
        assert is_blocked_domain("https://wikipedia.org/wiki/Test") is True
        assert is_blocked_domain("https://en.wikipedia.org/wiki/Test") is True
        assert is_blocked_domain("https://quora.com/question") is True


class TestIsJsHeavyDomain:
    """Tests for JavaScript-heavy domain detection."""

    def test_detects_js_heavy_domain(self):
        """Test detecting known JS-heavy domains."""
        assert is_js_heavy_domain("https://salesforce.com/jobs") is True

    def test_allows_non_js_heavy_domain(self):
        """Test allowing non-JS-heavy domains."""
        assert is_js_heavy_domain("https://example.com") is False
        assert is_js_heavy_domain("https://nasa.gov") is False

    def test_handles_subdomains(self):
        """Test handling subdomains of JS-heavy domains."""
        assert is_js_heavy_domain("https://jobs.salesforce.com") is True


class TestIsSlowRenderDomain:
    """Tests for slow-render domain detection."""

    def test_detects_slow_render_domain(self):
        """Test detecting known slow-render domains."""
        assert is_slow_render_domain("https://salesforce.com/careers") is True

    def test_allows_fast_render_domain(self):
        """Test allowing fast-render domains."""
        assert is_slow_render_domain("https://example.com") is False


class TestBlocklistCompleteness:
    """Tests to verify blocklist coverage and consistency."""

    def test_blocklist_has_social_media(self):
        """Test that blocklist includes major social media platforms."""
        social_media = ["reddit.com", "facebook.com", "twitter.com", "instagram.com"]
        for domain in social_media:
            assert domain in BLOCKED_DOMAINS, f"{domain} should be in blocklist"

    def test_blocklist_has_job_boards(self):
        """Test that blocklist includes major job boards."""
        job_boards = ["indeed.com", "glassdoor.com", "linkedin.com"]
        for domain in job_boards:
            assert domain in BLOCKED_DOMAINS, f"{domain} should be in blocklist"

    def test_blocklist_has_shopping(self):
        """Test that blocklist includes major shopping sites."""
        shopping = ["amazon.com", "ebay.com", "walmart.com"]
        for domain in shopping:
            assert domain in BLOCKED_DOMAINS, f"{domain} should be in blocklist"

    def test_blocklist_no_duplicates(self):
        """Test that blocklist has no duplicates."""
        assert len(BLOCKED_DOMAINS) == len(set(BLOCKED_DOMAINS))

    def test_all_domains_lowercase(self):
        """Test that all domains in blocklist are lowercase."""
        for domain in BLOCKED_DOMAINS:
            assert domain == domain.lower(), f"{domain} should be lowercase"

    def test_no_www_prefix(self):
        """Test that no domains have www. prefix (handled in lookup)."""
        for domain in BLOCKED_DOMAINS:
            assert not domain.startswith("www."), f"{domain} should not have www. prefix"

    def test_no_protocol_prefix(self):
        """Test that no domains have protocol prefix."""
        for domain in BLOCKED_DOMAINS:
            assert not domain.startswith("http"), f"{domain} should not have protocol"
            assert not domain.startswith("//"), f"{domain} should not have //"
