"""Tests for Pydantic models."""

import pytest
from datetime import datetime

# Import directly from models to avoid settings initialization
from src.db.models import ECCard, ECCategory, ECType, LocationType, PendingURL


class TestECCard:
    """Tests for ECCard model."""

    def test_create_minimal_ec_card(self):
        """Test creating an EC card with minimal required fields."""
        ec = ECCard(
            url="https://example.com/program",
            title="Test Program",
            summary="A test program for students",
        )
        
        assert ec.url == "https://example.com/program"
        assert ec.title == "Test Program"
        assert ec.category == ECCategory.OTHER
        assert ec.ec_type == ECType.OTHER
        assert ec.location_type == LocationType.ONLINE
        assert ec.tags == []
        assert ec.grade_levels == []

    def test_create_full_ec_card(self):
        """Test creating an EC card with all fields."""
        deadline = datetime(2026, 3, 15)
        ec = ECCard(
            url="https://scienceolympiad.org",
            title="Science Olympiad",
            summary="National STEM competition for high school students",
            organization="Science Olympiad Inc.",
            category=ECCategory.STEM,
            ec_type=ECType.COMPETITION,
            tags=["science", "competition", "team"],
            grade_levels=[9, 10, 11, 12],
            location_type=LocationType.IN_PERSON,
            location="National",
            deadline=deadline,
            cost="$75 per team",
            requirements="Must be enrolled in high school",
            extraction_confidence=0.95,
        )
        
        assert ec.category == ECCategory.STEM
        assert ec.ec_type == ECType.COMPETITION
        assert ec.deadline == deadline
        assert len(ec.tags) == 3
        assert ec.extraction_confidence == 0.95

    def test_embedding_text_generation(self):
        """Test generating text for embeddings."""
        ec = ECCard(
            url="https://example.com",
            title="Math Olympiad",
            summary="International math competition",
            organization="IMO",
            category=ECCategory.STEM,
            ec_type=ECType.COMPETITION,
            tags=["math", "competition"],
        )
        
        text = ec.to_embedding_text()
        assert "Math Olympiad" in text
        assert "International math competition" in text
        assert "STEM" in text
        assert "math" in text

    def test_confidence_bounds(self):
        """Test that confidence is bounded between 0 and 1."""
        # Valid confidence
        ec = ECCard(
            url="https://example.com",
            title="Test",
            summary="Test",
            extraction_confidence=0.5,
        )
        assert ec.extraction_confidence == 0.5
        
        # Boundary values
        ec_low = ECCard(url="x", title="t", summary="s", extraction_confidence=0.0)
        ec_high = ECCard(url="x", title="t", summary="s", extraction_confidence=1.0)
        assert ec_low.extraction_confidence == 0.0
        assert ec_high.extraction_confidence == 1.0


class TestPendingURL:
    """Tests for PendingURL model."""

    def test_create_pending_url(self):
        """Test creating a pending URL."""
        pending = PendingURL(
            url="https://example.com/new",
            source="curated:stem",
        )
        
        assert pending.url == "https://example.com/new"
        assert pending.source == "curated:stem"
        assert pending.priority == 0
        assert pending.status == "pending"
        assert pending.attempts == 0

    def test_pending_url_with_priority(self):
        """Test pending URL with custom priority."""
        pending = PendingURL(
            url="https://example.com",
            source="discovery",
            priority=8,
        )
        
        assert pending.priority == 8
