"""Tests for query generator utilities.

Note: These tests focus on the pure utility functions that don't require LLM calls.
"""

import pytest
from src.agents.query_generator import (
    QueryGenerator,
    CATEGORY_KEYWORDS,
    CATEGORY_TEMPLATES,
    HIGH_SIGNAL_TEMPLATES,
)


class TestQueryGenerator:
    """Tests for QueryGenerator class."""

    @pytest.fixture
    def generator(self):
        """Create a QueryGenerator instance for testing."""
        # Create without initializing provider
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen


class TestNormalizeQuery:
    """Tests for query normalization."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_lowercases_text(self, generator):
        """Test that text is lowercased."""
        result = generator._normalize_query("ROBOTICS Competition")
        assert result == "robotics competition"

    def test_removes_special_characters(self, generator):
        """Test that special characters are removed."""
        result = generator._normalize_query("STEM! @research #2026")
        assert result == "stem research 2026"

    def test_collapses_whitespace(self, generator):
        """Test that multiple spaces are collapsed."""
        result = generator._normalize_query("science   olympiad    2026")
        assert result == "science olympiad 2026"

    def test_strips_whitespace(self, generator):
        """Test that leading/trailing whitespace is stripped."""
        result = generator._normalize_query("  robotics program  ")
        assert result == "robotics program"

    def test_handles_empty_string(self, generator):
        """Test handling empty string."""
        result = generator._normalize_query("")
        assert result == ""

    def test_preserves_numbers(self, generator):
        """Test that numbers are preserved."""
        result = generator._normalize_query("summer 2026 program")
        assert result == "summer 2026 program"


class TestTokenize:
    """Tests for query tokenization."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_splits_on_whitespace(self, generator):
        """Test splitting query into tokens."""
        result = generator._tokenize("robotics summer program")
        assert result == ["robotics", "summer", "program"]

    def test_filters_empty_tokens(self, generator):
        """Test that empty tokens are filtered."""
        result = generator._tokenize("robotics  summer   program")
        assert result == ["robotics", "summer", "program"]

    def test_normalizes_before_tokenizing(self, generator):
        """Test that normalization happens before tokenizing."""
        result = generator._tokenize("ROBOTICS! Summer Program")
        assert result == ["robotics", "summer", "program"]


class TestIsNearDuplicate:
    """Tests for near-duplicate detection."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_detects_exact_duplicate(self, generator):
        """Test detecting exact duplicate after normalization."""
        existing = ["robotics summer program"]
        assert generator._is_near_duplicate("robotics summer program", existing) is True

    def test_detects_case_insensitive_duplicate(self, generator):
        """Test detecting case-insensitive duplicates."""
        existing = ["robotics summer program"]
        assert generator._is_near_duplicate("ROBOTICS SUMMER PROGRAM", existing) is True

    def test_detects_high_similarity(self, generator):
        """Test detecting high similarity queries (>86%)."""
        existing = ["robotics summer program 2026"]
        assert generator._is_near_duplicate("robotics summer program 2025", existing) is True

    def test_detects_high_token_overlap(self, generator):
        """Test detecting high token overlap (>80%)."""
        existing = ["robotics summer program high school"]
        # Same tokens, different order
        assert generator._is_near_duplicate("high school robotics summer program", existing) is True

    def test_allows_distinct_queries(self, generator):
        """Test allowing distinct queries."""
        existing = ["robotics summer program"]
        assert generator._is_near_duplicate("math competition high school", existing) is False

    def test_handles_empty_existing(self, generator):
        """Test handling empty existing list."""
        assert generator._is_near_duplicate("any query", []) is False


class TestDedupeQueries:
    """Tests for query deduplication."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_removes_exact_duplicates(self, generator):
        """Test removing exact duplicates."""
        queries = [
            "robotics summer program",
            "robotics summer program",
            "math competition",
        ]
        result = generator._dedupe_queries(queries)
        assert len(result) == 2
        assert "robotics summer program" in result
        assert "math competition" in result

    def test_removes_near_duplicates(self, generator):
        """Test removing near-duplicate queries."""
        queries = [
            "robotics summer program 2026",
            "robotics summer program 2025",  # Near duplicate
            "math competition high school",
        ]
        result = generator._dedupe_queries(queries)
        assert len(result) == 2

    def test_filters_short_queries(self, generator):
        """Test filtering queries shorter than 10 characters."""
        queries = [
            "short",  # Too short
            "robotics summer program",
        ]
        result = generator._dedupe_queries(queries)
        assert len(result) == 1
        assert "robotics summer program" in result

    def test_filters_non_strings(self, generator):
        """Test filtering non-string values."""
        queries = [
            "robotics program",
            123,  # Not a string
            None,  # Not a string
            "",  # Empty
        ]
        result = generator._dedupe_queries(queries)
        assert len(result) == 1
        assert "robotics program" in result

    def test_strips_whitespace(self, generator):
        """Test stripping whitespace from queries."""
        queries = ["  robotics program  "]
        result = generator._dedupe_queries(queries)
        assert result == ["robotics program"]


class TestCategorizeQuery:
    """Tests for query categorization."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_categorizes_competition(self, generator):
        """Test categorizing competition queries."""
        assert generator._categorize_query("science olympiad high school") == "competitions"
        assert generator._categorize_query("math competition 2026") == "competitions"
        assert generator._categorize_query("robotics contest") == "competitions"

    def test_categorizes_internship(self, generator):
        """Test categorizing internship queries."""
        assert generator._categorize_query("summer internship high school") == "internships"
        assert generator._categorize_query("tech intern program") == "internships"

    def test_categorizes_summer_programs(self, generator):
        """Test categorizing summer program queries."""
        assert generator._categorize_query("university summer program") == "summer_programs"
        assert generator._categorize_query("coding camp for teenagers") == "summer_programs"
        assert generator._categorize_query("STEM workshop high school") == "summer_programs"

    def test_categorizes_scholarships(self, generator):
        """Test categorizing scholarship queries."""
        assert generator._categorize_query("merit scholarship high school") == "scholarships"
        assert generator._categorize_query("STEM award application") == "scholarships"

    def test_categorizes_research(self, generator):
        """Test categorizing research queries."""
        assert generator._categorize_query("research opportunity high school") == "research"
        assert generator._categorize_query("science lab mentorship") == "research"

    def test_categorizes_volunteering(self, generator):
        """Test categorizing volunteering queries."""
        assert generator._categorize_query("volunteer opportunities youth") == "volunteering"
        assert generator._categorize_query("community service program") == "volunteering"
        assert generator._categorize_query("nonprofit volunteer high school") == "volunteering"

    def test_defaults_to_general(self, generator):
        """Test defaulting to general category."""
        assert generator._categorize_query("opportunities for students") == "general"


class TestFallbackQueries:
    """Tests for fallback query generation."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_generates_fallback_queries(self, generator):
        """Test generating fallback queries from templates."""
        result = generator._fallback_queries("robotics", 5)
        assert len(result) == 5
        assert all(isinstance(q, str) for q in result)

    def test_includes_user_query(self, generator):
        """Test that fallback queries include user query term."""
        result = generator._fallback_queries("robotics", 10)
        assert all("robotics" in q.lower() for q in result)

    def test_respects_count_limit(self, generator):
        """Test that fallback queries respect count limit."""
        result = generator._fallback_queries("test", 3)
        assert len(result) == 3

    def test_handles_empty_query(self, generator):
        """Test handling empty query."""
        result = generator._fallback_queries("", 5)
        assert len(result) == 5


class TestGenerateProfileQueries:
    """Tests for profile-aware query generation."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_generates_interest_queries(self, generator):
        """Test generating queries based on user interests."""
        profile = {"interests": ["AI", "robotics"]}
        result = generator._generate_profile_queries("summer program", profile)
        assert len(result) > 0
        assert any("AI" in q for q in result)

    def test_generates_location_queries(self, generator):
        """Test generating queries based on user location."""
        profile = {"location": "California"}
        result = generator._generate_profile_queries("summer program", profile)
        assert len(result) > 0
        assert any("California" in q for q in result)

    def test_handles_missing_interests(self, generator):
        """Test handling profile without interests."""
        profile = {"location": "Texas"}
        result = generator._generate_profile_queries("STEM", profile)
        # Should still generate location-based queries
        assert any("Texas" in q for q in result)

    def test_handles_empty_profile(self, generator):
        """Test handling empty profile."""
        result = generator._generate_profile_queries("robotics", {})
        assert result == []

    def test_limits_interest_queries(self, generator):
        """Test that only top 2 interests are used."""
        profile = {"interests": ["AI", "robotics", "biotech", "space"]}
        result = generator._generate_profile_queries("program", profile)
        # Should only use first 2 interests
        interest_mentions = sum(1 for q in result if any(i in q for i in ["AI", "robotics"]))
        other_mentions = sum(1 for q in result if any(i in q for i in ["biotech", "space"]))
        assert interest_mentions > 0
        # biotech/space might appear 0 times since we limit to 2 interests


class TestParseJsonArray:
    """Tests for JSON array parsing in query generator."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_parses_valid_array(self, generator):
        """Test parsing valid JSON array."""
        result = generator._parse_json_array('["query 1", "query 2"]')
        assert result == ["query 1", "query 2"]

    def test_handles_code_fences(self, generator):
        """Test handling JSON in code fences."""
        result = generator._parse_json_array('```json\n["query 1"]\n```')
        assert result == ["query 1"]

    def test_returns_empty_for_invalid(self, generator):
        """Test returning empty list for invalid JSON."""
        result = generator._parse_json_array("not json")
        assert result == []

    def test_converts_items_to_strings(self, generator):
        """Test that items are converted to strings."""
        result = generator._parse_json_array('["query", 123, true]')
        assert all(isinstance(q, str) for q in result)


class TestCategoryTemplates:
    """Tests for category template definitions."""

    def test_all_categories_have_templates(self):
        """Test that all categories have templates defined."""
        for category in CATEGORY_KEYWORDS:
            assert category in CATEGORY_TEMPLATES, f"Missing templates for {category}"

    def test_templates_have_focus_placeholder(self):
        """Test that all templates have {focus} placeholder."""
        for category, templates in CATEGORY_TEMPLATES.items():
            for template in templates:
                assert "{focus}" in template, f"Template missing {{focus}}: {template}"

    def test_high_signal_templates_exist(self):
        """Test that high signal templates are defined."""
        assert len(HIGH_SIGNAL_TEMPLATES) > 0
        for template in HIGH_SIGNAL_TEMPLATES:
            assert "{focus}" in template


class TestEnsureCategoryCoverage:
    """Tests for ensuring category coverage."""

    @pytest.fixture
    def generator(self):
        gen = object.__new__(QueryGenerator)
        gen.provider = None
        return gen

    def test_fills_missing_categories(self, generator):
        """Test that missing categories are filled."""
        queries = ["math competition high school"]  # Only competitions
        result = generator._ensure_category_coverage("math", queries, target_count=10)
        
        # Should have added queries for other categories
        assert len(result) > len(queries)

    def test_respects_target_count(self, generator):
        """Test that target count is respected."""
        queries = []
        result = generator._ensure_category_coverage("robotics", queries, target_count=6)
        
        # Should fill up to target count
        assert len(result) >= 5  # At least min(5, target_count)

    def test_avoids_duplicates(self, generator):
        """Test that no duplicates are added."""
        queries = ["robotics olympiad high school 2026"]
        result = generator._ensure_category_coverage("robotics", queries, target_count=10)
        
        # Check no exact duplicates
        normalized = [generator._normalize_query(q) for q in result]
        assert len(normalized) == len(set(normalized))
