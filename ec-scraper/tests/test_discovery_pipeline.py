"""Tests for discovery pipeline improvements:

1. Deduplication & staleness logic
2. List page extraction flow
3. Intent-based filtering in evaluator
"""

import asyncio
from datetime import datetime, timedelta
from unittest.mock import MagicMock, AsyncMock, patch
from typing import List, Optional

import pytest

from src.agents.discovery import DiscoveryAgent, ResearchState
from src.agents.extractor import ExtractorAgent, MultiExtractionResult
from src.db.models import (
    ExtractionResult,
    OpportunityCard,
    OpportunityCategory,
    OpportunityType,
    ContentType,
    LocationType,
    OpportunityTiming,
)


# ── Helpers ───────────────────────────────────────────────────────────────


def _make_agent() -> DiscoveryAgent:
    """Create a DiscoveryAgent without hitting real services."""
    agent = object.__new__(DiscoveryAgent)
    agent.provider = MagicMock()
    agent.query_generator = MagicMock()
    agent.db = MagicMock()
    agent._graph = None  # not needed for unit tests
    return agent


def _make_extractor() -> ExtractorAgent:
    """Create an ExtractorAgent without hitting real services."""
    ext = object.__new__(ExtractorAgent)
    ext.provider = MagicMock()
    return ext


def _make_opp(title: str = "Test Opportunity", url: str = "https://example.com/prog") -> OpportunityCard:
    return OpportunityCard(
        url=url,
        title=title,
        summary="A test opportunity",
        organization="Test Org",
        content_type=ContentType.OPPORTUNITY,
        category=OpportunityCategory.STEM,
        opportunity_type=OpportunityType.COMPETITION,
        tags=[],
        grade_levels=[9, 10, 11, 12],
        location_type=LocationType.ONLINE,
        extraction_confidence=0.8,
        timing_type=OpportunityTiming.ANNUAL,
        is_expired=False,
        recheck_days=14,
    )


# ══════════════════════════════════════════════════════════════════════════
# Phase 1: Deduplication & Staleness Tests
# ══════════════════════════════════════════════════════════════════════════


class TestDeduplicationLogic:
    """Tests for the smart dedup logic in _searcher_node."""

    @pytest.mark.asyncio
    async def test_fresh_urls_are_skipped(self):
        """URLs checked < 30 days ago should be skipped."""
        agent = _make_agent()

        # Mock url_cache
        mock_cache = MagicMock()
        # URL seen within 30 days (fresh)
        mock_cache.batch_check_seen.side_effect = lambda urls, within_days=None: (
            {"https://fresh.com/prog"} if within_days == 30
            else {"https://fresh.com/prog"}
        )

        # Mock search client
        mock_result = MagicMock()
        mock_result.url = "https://fresh.com/prog"
        mock_result.snippet = "A program"

        mock_search = AsyncMock()
        mock_search.search.return_value = [mock_result]

        state: ResearchState = {
            "focus_area": "STEM",
            "search_queries": ["test query"],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        with patch("src.search.searxng_client.get_searxng_client", return_value=mock_search), \
             patch("src.db.url_cache.get_url_cache", return_value=mock_cache):
            result = await agent._searcher_node(state)

        assert len(result["discovered_urls"]) == 0
        assert result["stats"]["dedup_fresh_skipped"] == 1
        assert result["stats"]["dedup_new"] == 0

    @pytest.mark.asyncio
    async def test_stale_urls_are_refreshed(self):
        """URLs checked > 30 days ago should be re-processed."""
        agent = _make_agent()

        mock_cache = MagicMock()
        # Not seen within 30 days, but seen at some point
        mock_cache.batch_check_seen.side_effect = lambda urls, within_days=None: (
            set() if within_days == 30
            else {"https://stale.com/prog"}
        )

        mock_result = MagicMock()
        mock_result.url = "https://stale.com/prog"
        mock_result.snippet = "Old program"

        mock_search = AsyncMock()
        mock_search.search.return_value = [mock_result]

        state: ResearchState = {
            "focus_area": "STEM",
            "search_queries": ["test query"],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        with patch("src.search.searxng_client.get_searxng_client", return_value=mock_search), \
             patch("src.db.url_cache.get_url_cache", return_value=mock_cache):
            result = await agent._searcher_node(state)

        assert "https://stale.com/prog" in result["discovered_urls"]
        assert result["stats"]["dedup_stale_refreshed"] == 1

    @pytest.mark.asyncio
    async def test_new_urls_pass_through(self):
        """Brand new URLs should pass through to processing."""
        agent = _make_agent()

        mock_cache = MagicMock()
        # Not seen at all
        mock_cache.batch_check_seen.return_value = set()

        mock_result = MagicMock()
        mock_result.url = "https://new.com/prog"
        mock_result.snippet = "Brand new program"

        mock_search = AsyncMock()
        mock_search.search.return_value = [mock_result]

        state: ResearchState = {
            "focus_area": "STEM",
            "search_queries": ["test query"],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        with patch("src.search.searxng_client.get_searxng_client", return_value=mock_search), \
             patch("src.db.url_cache.get_url_cache", return_value=mock_cache):
            result = await agent._searcher_node(state)

        assert "https://new.com/prog" in result["discovered_urls"]
        assert result["stats"]["dedup_new"] == 1

    @pytest.mark.asyncio
    async def test_mixed_urls_dedup(self):
        """Test a mix of fresh, stale, and new URLs."""
        agent = _make_agent()

        mock_cache = MagicMock()
        def mock_batch_check(urls, within_days=None):
            if within_days == 30:
                return {"https://fresh.com"}
            return {"https://fresh.com", "https://stale.com"}
        mock_cache.batch_check_seen.side_effect = mock_batch_check

        results = []
        for url in ["https://fresh.com", "https://stale.com", "https://new.com"]:
            r = MagicMock()
            r.url = url
            r.snippet = "test"
            results.append(r)

        mock_search = AsyncMock()
        mock_search.search.return_value = results

        state: ResearchState = {
            "focus_area": "STEM",
            "search_queries": ["test"],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        with patch("src.search.searxng_client.get_searxng_client", return_value=mock_search), \
             patch("src.db.url_cache.get_url_cache", return_value=mock_cache):
            result = await agent._searcher_node(state)

        assert result["stats"]["dedup_fresh_skipped"] == 1
        assert result["stats"]["dedup_stale_refreshed"] == 1
        assert result["stats"]["dedup_new"] == 1
        assert len(result["discovered_urls"]) == 2  # stale + new


# ══════════════════════════════════════════════════════════════════════════
# Phase 2: List Page Extraction Tests
# ══════════════════════════════════════════════════════════════════════════


class TestListExtraction:
    """Tests for list/aggregator page extraction flow."""

    def test_is_likely_guide_detects_listicles(self):
        """Test that guide detection catches listicle content."""
        ext = _make_extractor()
        content = (
            "# Ultimate Guide to STEM Programs\n\n"
            "Table of Contents\n"
            "- Program 1\n- Program 2\n- Program 3\n- Program 4\n"
            "- Program 5\n- Program 6\n- Program 7\n- Program 8\n- Program 9\n"
        )
        assert ext._is_likely_guide(content) is True

    def test_is_likely_guide_allows_programs(self):
        """Test that guide detection allows legitimate program pages."""
        ext = _make_extractor()
        content = (
            "# NASA Summer Internship Program\n\n"
            "Apply now for our high school summer research program.\n"
            "Deadline: March 15, 2026\n"
            "Requirements: Must be a US citizen, enrolled in grades 10-12.\n"
        )
        assert ext._is_likely_guide(content) is False

    def test_is_likely_list_page(self):
        """Test list page detection."""
        ext = _make_extractor()
        content = (
            "# Top 20 STEM Internships for High School Students\n\n"
            "Here are the best programs for students:\n\n"
            "1. NASA SEES Internship - A great program from NASA\n"
            "2. MIT Research Science Institute - Prestigious summer program\n"
            "3. Stanford AI Summer Program - Learn about AI\n"
            "4. Google CSSI - Computer Science Summer Institute\n"
            "5. Microsoft TEALS - Technology Education program\n"
            "  University of Chicago, Foundation, NSF, NASA programs, \n"
            "  scholarship, internship, competition, program, institute, college\n"
        )
        assert ext._is_likely_list_page(content) is True

    @pytest.mark.asyncio
    async def test_extract_routes_guide_to_list_extraction(self):
        """Test that guides/listicles are routed to list extraction."""
        ext = _make_extractor()

        guide_content = (
            "# Top 10 Best STEM Programs for Students\n\n"
            "Table of Contents\n"
            "- Program 1\n- Program 2\n- Program 3\n- Program 4\n"
            "- Program 5\n- Program 6\n- Program 7\n- Program 8\n- Program 9\n"
        )

        mock_opps = [
            _make_opp("NASA SEES", "https://nasa.gov/sees"),
            _make_opp("MIT RSI", "https://mit.edu/rsi"),
        ]

        with patch.object(ext, "extract_list", new_callable=AsyncMock) as mock_extract_list:
            mock_extract_list.return_value = MultiExtractionResult(
                success=True,
                opportunities=mock_opps,
                is_list_page=True,
            )

            result = await ext.extract(guide_content, "https://example.com/top-10")

        assert result.success is True
        assert result.opportunity_card.title == "NASA SEES"
        assert result.list_opportunities is not None
        assert len(result.list_opportunities) == 2

    @pytest.mark.asyncio
    async def test_extract_fails_on_empty_list(self):
        """If list extraction finds nothing, should return failure (no fallthrough)."""
        ext = _make_extractor()

        guide_content = (
            "# Best Programs Guide\n\n"
            "Table of Contents\n"
            "- Item 1\n- Item 2\n- Item 3\n- Item 4\n"
            "- Item 5\n- Item 6\n- Item 7\n- Item 8\n- Item 9\n"
            "\n" * 50 +  # pad to ensure it's not "too short"
            "More content about programs and applications here.\n" * 20
        )

        with patch.object(ext, "extract_list", new_callable=AsyncMock) as mock_extract_list:
            # List extraction finds nothing
            mock_extract_list.return_value = MultiExtractionResult(
                success=False, opportunities=[], is_list_page=False,
            )

            result = await ext.extract(guide_content, "https://example.com/prog")

        # NEW: Should return failure instead of falling through
        assert result.success is False
        assert "guide" in result.error.lower() or "listicle" in result.error.lower()


# ══════════════════════════════════════════════════════════════════════════
# Phase 3: Intent-Based Filtering Tests
# ══════════════════════════════════════════════════════════════════════════


class TestIntentBasedFiltering:
    """Tests for intent-aware URL filtering in _evaluator_node."""

    @pytest.mark.asyncio
    async def test_strict_intent_drops_guide_urls(self):
        """Strict intent queries (competitions) should drop guide URLs."""
        agent = _make_agent()

        state: ResearchState = {
            "focus_area": "STEM competitions",
            "search_queries": [],
            "discovered_urls": [
                "https://example.com/blog/top-10-competitions",
                "https://scioly.org/events",
                "https://nasa.gov/competitions",
            ],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        result = await agent._evaluator_node(state)

        # blog/top-10 URL should be dropped
        assert "https://example.com/blog/top-10-competitions" in result["rejected_urls"]
        # scioly.org is an aggregator — should be accepted
        assert "https://scioly.org/events" in result["evaluated_urls"]
        # nasa.gov should be accepted
        assert "https://nasa.gov/competitions" in result["evaluated_urls"]

    @pytest.mark.asyncio
    async def test_general_intent_accepts_all(self):
        """General (non-strict) queries should accept all URLs."""
        agent = _make_agent()

        state: ResearchState = {
            "focus_area": "STEM opportunities for high school",
            "search_queries": [],
            "discovered_urls": [
                "https://example.com/blog/top-10-programs",
                "https://nasa.gov/programs",
            ],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        result = await agent._evaluator_node(state)

        # General intent — no strict filtering, all pass
        assert len(result["evaluated_urls"]) == 2
        assert len(result["rejected_urls"]) == 0

    @pytest.mark.asyncio
    async def test_aggregator_domains_exempted(self):
        """Known aggregator domains should be exempted even for strict intents."""
        agent = _make_agent()

        state: ResearchState = {
            "focus_area": "scholarships",
            "search_queries": [],
            "discovered_urls": [
                "https://fastweb.com/blog/scholarships",
                "https://random-blog.com/blog/scholarships",
            ],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        result = await agent._evaluator_node(state)

        # fastweb.com is a known aggregator — accepted
        assert "https://fastweb.com/blog/scholarships" in result["evaluated_urls"]
        # random blog — dropped
        assert "https://random-blog.com/blog/scholarships" in result["rejected_urls"]

    @pytest.mark.asyncio
    async def test_evaluator_logs_drop_reasons(self):
        """Evaluator should track drop reasons in stats."""
        agent = _make_agent()

        state: ResearchState = {
            "focus_area": "internships",
            "search_queries": [],
            "discovered_urls": [
                "https://example.com/blog/best-internships",
                "https://other.com/how-to/find-internships",
            ],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        result = await agent._evaluator_node(state)

        assert result["stats"]["evaluator_dropped"] == 2
        assert result["stats"]["evaluator_accepted"] == 0
        assert "evaluator_drop_reasons" in result["stats"]

    @pytest.mark.asyncio
    async def test_empty_url_list(self):
        """Evaluator should handle empty URL list."""
        agent = _make_agent()

        state: ResearchState = {
            "focus_area": "competitions",
            "search_queries": [],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": 1,
            "target_url_count": 10,
            "user_profile": None,
            "is_personalized": False,
            "extracted_opportunities": [],
            "enriched_opportunities": [],
            "stats": {},
        }

        result = await agent._evaluator_node(state)
        assert result["evaluated_urls"] == []
        assert result["rejected_urls"] == []


# ══════════════════════════════════════════════════════════════════════════
# URL Scoring Tests
# ══════════════════════════════════════════════════════════════════════════


class TestURLScoring:
    """Tests for URL scoring used by the searcher."""

    def test_edu_domain_gets_boost(self):
        agent = _make_agent()
        score = agent._score_url("https://mit.edu/programs")
        assert score > 0.5

    def test_blog_gets_penalty(self):
        agent = _make_agent()
        score = agent._score_url("https://example.com/blog/top-10-programs")
        assert score < 0.5

    def test_gov_domain_gets_boost(self):
        agent = _make_agent()
        score = agent._score_url("https://nasa.gov/stem")
        assert score > 0.6

    def test_score_clamped(self):
        """Score should always be between 0 and 1."""
        agent = _make_agent()
        # URL with many negative signals
        score = agent._score_url("https://reddit.com/blog/news/article/how-to/top-10")
        assert 0.0 <= score <= 1.0

        # URL with many positive signals
        score = agent._score_url("https://edu.gov/scholarship/internship/program/apply")
        assert 0.0 <= score <= 1.0
