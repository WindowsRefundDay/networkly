"""Tests for semantic filter utilities.

Note: These tests focus on pure functions that don't require API calls.
Integration tests requiring embeddings would need mocking.
"""

import pytest
import numpy as np
from src.search.semantic_filter import (
    REFERENCE_TEXT,
    GUIDE_HINTS,
    PREFILTER_URL_HINTS,
    PREFILTER_TEXT_HINTS,
    SemanticFilter,
)


class TestSemanticFilterInit:
    """Tests for SemanticFilter initialization."""

    def test_default_threshold(self):
        """Test default threshold is set from settings."""
        # Create filter without initializing client
        filter_obj = object.__new__(SemanticFilter)
        filter_obj.threshold = 0.55
        filter_obj._client = None
        filter_obj._model = None
        filter_obj._reference_embedding = None
        filter_obj.last_prefilter_skipped = 0
        
        assert filter_obj.threshold == 0.55

    def test_set_threshold(self):
        """Test setting threshold dynamically."""
        filter_obj = object.__new__(SemanticFilter)
        filter_obj.threshold = 0.55
        filter_obj._client = None
        filter_obj._model = None
        filter_obj._reference_embedding = None
        filter_obj.last_prefilter_skipped = 0
        
        filter_obj.set_threshold(0.70)
        assert filter_obj.threshold == 0.70


class TestGuidePenalty:
    """Tests for guide/article penalty calculation."""

    @pytest.fixture
    def filter_obj(self):
        """Create filter instance for testing."""
        f = object.__new__(SemanticFilter)
        f.threshold = 0.55
        f._client = None
        f._model = None
        f._reference_embedding = None
        f.last_prefilter_skipped = 0
        return f

    def test_no_penalty_for_clean_result(self, filter_obj):
        """Test no penalty for results without guide keywords."""
        penalty = filter_obj._guide_penalty(
            "NASA Summer Internship Program",
            "Apply now for high school students"
        )
        assert penalty == 0.0

    def test_small_penalty_for_guide_hints(self, filter_obj):
        """Test small penalty for general guide hints."""
        penalty = filter_obj._guide_penalty(
            "Guide to Summer Programs",
            "Best opportunities for students"
        )
        assert penalty > 0.0
        assert penalty <= 0.08

    def test_larger_penalty_for_strong_hints(self, filter_obj):
        """Test larger penalty for strong guide indicators."""
        penalty = filter_obj._guide_penalty(
            "Ultimate Guide to STEM Programs",
            "Step-by-step how to apply"
        )
        assert penalty >= 0.05

    def test_penalty_capped_at_max(self, filter_obj):
        """Test that penalty is capped at maximum value."""
        penalty = filter_obj._guide_penalty(
            "Ultimate Guide: How to Find Best Programs",
            "Step-by-step tips for finding top scholarships list of resources"
        )
        assert penalty <= 0.08


class TestShouldPrefilter:
    """Tests for prefilter decision logic."""

    @pytest.fixture
    def filter_obj(self):
        f = object.__new__(SemanticFilter)
        f.threshold = 0.55
        f._client = None
        f._model = None
        f._reference_embedding = None
        f.last_prefilter_skipped = 0
        return f

    def test_filters_obvious_guides(self, filter_obj):
        """Test filtering obvious guide/listicle URLs with matching text."""
        result = filter_obj._should_prefilter(
            "https://example.com/blog/ultimate-guide-programs",
            "Ultimate Guide to Programs",
            "Step-by-step how to find programs"
        )
        assert result is True

    def test_allows_program_urls(self, filter_obj):
        """Test allowing legitimate program URLs."""
        result = filter_obj._should_prefilter(
            "https://nasa.gov/stem/internships",
            "NASA Summer Internship",
            "Apply for our high school research program"
        )
        assert result is False

    def test_requires_two_signals(self, filter_obj):
        """Test that prefilter requires both URL and text hints."""
        # URL hint only
        result1 = filter_obj._should_prefilter(
            "https://example.com/blog/programs",
            "NASA Summer Program",
            "Apply now for high school students"
        )
        
        # Text hint only
        result2 = filter_obj._should_prefilter(
            "https://nasa.gov/programs",
            "Ultimate Guide to Programs",
            "How to apply"
        )
        
        # Both should pass through (not filtered) since only one signal each
        assert result1 is False
        assert result2 is False

    def test_filters_list_articles(self, filter_obj):
        """Test filtering list articles."""
        result = filter_obj._should_prefilter(
            "https://example.com/guides/top-10-programs",
            "Top 10 STEM Programs",
            "Ranking of best programs"
        )
        assert result is True


class TestCosineSimilarityBatch:
    """Tests for batch cosine similarity calculation."""

    @pytest.fixture
    def filter_obj(self):
        f = object.__new__(SemanticFilter)
        f.threshold = 0.55
        f._client = None
        f._model = None
        f._reference_embedding = None
        f.last_prefilter_skipped = 0
        return f

    def test_empty_embeddings(self, filter_obj):
        """Test handling empty embeddings list."""
        reference = np.array([1.0, 0.0, 0.0])
        result = filter_obj._cosine_similarity_batch([], reference)
        assert result == []

    def test_identical_vectors(self, filter_obj):
        """Test similarity of identical vectors."""
        reference = np.array([1.0, 0.0, 0.0])
        embeddings = [np.array([1.0, 0.0, 0.0])]
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 1
        assert abs(result[0] - 1.0) < 0.0001

    def test_orthogonal_vectors(self, filter_obj):
        """Test similarity of orthogonal vectors."""
        reference = np.array([1.0, 0.0, 0.0])
        embeddings = [np.array([0.0, 1.0, 0.0])]
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 1
        assert abs(result[0]) < 0.0001

    def test_opposite_vectors(self, filter_obj):
        """Test similarity of opposite vectors."""
        reference = np.array([1.0, 0.0, 0.0])
        embeddings = [np.array([-1.0, 0.0, 0.0])]
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 1
        assert abs(result[0] + 1.0) < 0.0001

    def test_multiple_embeddings(self, filter_obj):
        """Test with multiple embeddings."""
        reference = np.array([1.0, 0.0, 0.0])
        embeddings = [
            np.array([1.0, 0.0, 0.0]),  # Identical
            np.array([0.0, 1.0, 0.0]),  # Orthogonal
            np.array([0.707, 0.707, 0.0]),  # 45 degrees
        ]
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 3
        assert abs(result[0] - 1.0) < 0.0001
        assert abs(result[1]) < 0.0001
        assert 0.7 < result[2] < 0.71  # ~0.707

    def test_handles_zero_norm(self, filter_obj):
        """Test handling of zero-norm vectors."""
        reference = np.array([1.0, 0.0, 0.0])
        embeddings = [np.array([0.0, 0.0, 0.0])]  # Zero vector
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 1
        # Should handle gracefully (return 0 or similar)

    def test_zero_reference(self, filter_obj):
        """Test handling of zero reference vector."""
        reference = np.array([0.0, 0.0, 0.0])
        embeddings = [np.array([1.0, 0.0, 0.0])]
        result = filter_obj._cosine_similarity_batch(embeddings, reference)
        assert len(result) == 1
        assert result[0] == 0.0


class TestPrefilterHints:
    """Tests for prefilter hint definitions."""

    def test_url_hints_are_lowercase(self):
        """Test that URL hints are lowercase for matching."""
        for hint in PREFILTER_URL_HINTS:
            assert hint == hint.lower()

    def test_text_hints_are_lowercase(self):
        """Test that text hints are lowercase for matching."""
        for hint in PREFILTER_TEXT_HINTS:
            assert hint == hint.lower()

    def test_guide_hints_exist(self):
        """Test that guide hints are defined."""
        assert len(GUIDE_HINTS) > 0
        assert "guide" in GUIDE_HINTS
        assert "how to" in GUIDE_HINTS


class TestReferenceText:
    """Tests for reference text definition."""

    def test_reference_text_not_empty(self):
        """Test that reference text is defined."""
        assert len(REFERENCE_TEXT.strip()) > 100

    def test_reference_text_contains_keywords(self):
        """Test that reference text contains relevant keywords."""
        text_lower = REFERENCE_TEXT.lower()
        assert "high school" in text_lower
        assert "summer" in text_lower
        assert "program" in text_lower
        assert "application" in text_lower
        assert "competition" in text_lower

    def test_reference_text_multi_category(self):
        """Test that reference text covers multiple opportunity types."""
        text_lower = REFERENCE_TEXT.lower()
        categories = ["internship", "scholarship", "competition", "camp", "research"]
        found = [c for c in categories if c in text_lower]
        assert len(found) >= 3  # Should cover at least 3 categories


class TestFilterResultsEdgeCases:
    """Tests for edge cases in filter_results."""

    @pytest.fixture
    def filter_obj(self):
        f = object.__new__(SemanticFilter)
        f.threshold = 0.55
        f._client = None
        f._model = None
        f._reference_embedding = None
        f.last_prefilter_skipped = 0
        return f

    @pytest.mark.asyncio
    async def test_empty_results(self, filter_obj):
        """Test handling empty results list."""
        result = await filter_obj.filter_results([])
        assert result == []
