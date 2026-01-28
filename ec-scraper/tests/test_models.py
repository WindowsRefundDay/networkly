"""Tests for Pydantic models."""

import pytest
from datetime import datetime, timedelta
from uuid import UUID

from src.db.models import (
    OpportunityTiming,
    OpportunityCategory,
    OpportunityType,
    ContentType,
    LocationType,
    OpportunityCard,
    PendingURL,
    ExtractionResult,
    ExtractionResponse,
)


class TestOpportunityTiming:
    """Tests for OpportunityTiming enum."""

    def test_all_timing_values(self):
        """Test that all expected timing values exist."""
        assert OpportunityTiming.ONE_TIME.value == "one-time"
        assert OpportunityTiming.ANNUAL.value == "annual"
        assert OpportunityTiming.RECURRING.value == "recurring"
        assert OpportunityTiming.ROLLING.value == "rolling"
        assert OpportunityTiming.ONGOING.value == "ongoing"
        assert OpportunityTiming.SEASONAL.value == "seasonal"

    def test_timing_is_string_enum(self):
        """Test that timing enum values are strings."""
        for timing in OpportunityTiming:
            assert isinstance(timing.value, str)


class TestOpportunityCategory:
    """Tests for OpportunityCategory enum."""

    def test_stem_category(self):
        """Test STEM category exists."""
        assert OpportunityCategory.STEM.value == "STEM"

    def test_other_category(self):
        """Test Other category exists as fallback."""
        assert OpportunityCategory.OTHER.value == "Other"

    def test_all_categories_exist(self):
        """Test all expected categories exist."""
        expected = [
            "STEM", "Arts", "Business", "Leadership", "Community Service",
            "Sports", "Humanities", "Language", "Music", "Debate", "Other"
        ]
        actual = [c.value for c in OpportunityCategory]
        for e in expected:
            assert e in actual, f"Missing category: {e}"


class TestOpportunityType:
    """Tests for OpportunityType enum."""

    def test_competition_type(self):
        """Test Competition type exists."""
        assert OpportunityType.COMPETITION.value == "Competition"

    def test_all_types_exist(self):
        """Test all expected types exist."""
        expected = [
            "Competition", "Internship", "Summer Program", "Camp",
            "Volunteer", "Research", "Club", "Scholarship", "Course",
            "Workshop", "Conference", "Other"
        ]
        actual = [t.value for t in OpportunityType]
        for e in expected:
            assert e in actual, f"Missing type: {e}"


class TestContentType:
    """Tests for ContentType enum."""

    def test_content_types(self):
        """Test content type values."""
        assert ContentType.OPPORTUNITY.value == "opportunity"
        assert ContentType.GUIDE.value == "guide"
        assert ContentType.ARTICLE.value == "article"


class TestLocationType:
    """Tests for LocationType enum."""

    def test_location_types(self):
        """Test location type values."""
        assert LocationType.IN_PERSON.value == "In-Person"
        assert LocationType.ONLINE.value == "Online"
        assert LocationType.HYBRID.value == "Hybrid"


class TestOpportunityCard:
    """Tests for OpportunityCard model."""

    def test_create_minimal_card(self):
        """Test creating a card with minimal required fields."""
        card = OpportunityCard(
            url="https://example.com/program",
            title="Test Program",
            summary="A test program for students",
        )
        
        assert card.url == "https://example.com/program"
        assert card.title == "Test Program"
        assert card.category == OpportunityCategory.OTHER
        assert card.opportunity_type == OpportunityType.OTHER
        assert card.location_type == LocationType.ONLINE
        assert card.tags == []
        assert card.grade_levels == []

    def test_create_full_card(self):
        """Test creating a card with all fields."""
        deadline = datetime(2026, 3, 15)
        card = OpportunityCard(
            url="https://scienceolympiad.org",
            title="Science Olympiad",
            summary="National STEM competition for high school students",
            organization="Science Olympiad Inc.",
            category=OpportunityCategory.STEM,
            opportunity_type=OpportunityType.COMPETITION,
            tags=["science", "competition", "team"],
            grade_levels=[9, 10, 11, 12],
            location_type=LocationType.IN_PERSON,
            location="National",
            deadline=deadline,
            cost="$75 per team",
            requirements="Must be enrolled in high school",
            extraction_confidence=0.95,
        )
        
        assert card.category == OpportunityCategory.STEM
        assert card.opportunity_type == OpportunityType.COMPETITION
        assert card.deadline == deadline
        assert len(card.tags) == 3
        assert card.extraction_confidence == 0.95

    def test_embedding_text_generation(self):
        """Test generating text for embeddings."""
        card = OpportunityCard(
            url="https://example.com",
            title="Math Olympiad",
            summary="International math competition",
            organization="IMO",
            category=OpportunityCategory.STEM,
            opportunity_type=OpportunityType.COMPETITION,
            tags=["math", "competition"],
        )
        
        text = card.to_embedding_text()
        assert "Math Olympiad" in text
        assert "International math competition" in text
        assert "STEM" in text
        assert "math" in text

    def test_confidence_bounds(self):
        """Test that confidence is bounded between 0 and 1."""
        # Valid confidence
        card = OpportunityCard(
            url="https://example.com",
            title="Test",
            summary="Test",
            extraction_confidence=0.5,
        )
        assert card.extraction_confidence == 0.5
        
        # Boundary values
        card_low = OpportunityCard(url="x", title="t", summary="s", extraction_confidence=0.0)
        card_high = OpportunityCard(url="x", title="t", summary="s", extraction_confidence=1.0)
        assert card_low.extraction_confidence == 0.0
        assert card_high.extraction_confidence == 1.0

    def test_invalid_confidence_too_high(self):
        """Test that confidence > 1.0 raises error."""
        with pytest.raises(ValueError):
            OpportunityCard(
                url="https://example.com",
                title="Test",
                summary="Test",
                extraction_confidence=1.5,
            )

    def test_invalid_confidence_negative(self):
        """Test that negative confidence raises error."""
        with pytest.raises(ValueError):
            OpportunityCard(
                url="https://example.com",
                title="Test",
                summary="Test",
                extraction_confidence=-0.1,
            )

    def test_auto_generates_id(self):
        """Test that ID is auto-generated as UUID."""
        card = OpportunityCard(url="x", title="t", summary="s")
        assert card.id is not None
        # Verify it's a valid UUID string
        UUID(card.id)

    def test_auto_generates_dates(self):
        """Test that discovery and update dates are auto-generated."""
        before = datetime.utcnow()
        card = OpportunityCard(url="x", title="t", summary="s")
        after = datetime.utcnow()
        
        assert before <= card.date_discovered <= after
        assert before <= card.date_updated <= after

    def test_timing_defaults_to_one_time(self):
        """Test that timing defaults to one-time."""
        card = OpportunityCard(url="x", title="t", summary="s")
        assert card.timing_type == OpportunityTiming.ONE_TIME

    def test_expired_defaults_to_false(self):
        """Test that is_expired defaults to False."""
        card = OpportunityCard(url="x", title="t", summary="s")
        assert card.is_expired is False

    def test_content_type_defaults_to_opportunity(self):
        """Test that content_type defaults to opportunity."""
        card = OpportunityCard(url="x", title="t", summary="s")
        assert card.content_type == ContentType.OPPORTUNITY

    def test_suggested_category_field(self):
        """Test suggested_category field for custom categories."""
        card = OpportunityCard(
            url="x",
            title="t",
            summary="s",
            category=OpportunityCategory.OTHER,
            suggested_category="Entrepreneurship",
        )
        assert card.suggested_category == "Entrepreneurship"

    def test_embedding_text_with_requirements(self):
        """Test embedding text includes requirements when present."""
        card = OpportunityCard(
            url="x",
            title="Test Program",
            summary="A program",
            requirements="Must be 16+",
        )
        text = card.to_embedding_text()
        assert "Must be 16+" in text


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

    def test_priority_bounds(self):
        """Test priority is bounded 0-10."""
        pending = PendingURL(url="x", source="s", priority=0)
        assert pending.priority == 0
        
        pending = PendingURL(url="x", source="s", priority=10)
        assert pending.priority == 10

    def test_invalid_priority_too_high(self):
        """Test that priority > 10 raises error."""
        with pytest.raises(ValueError):
            PendingURL(url="x", source="s", priority=11)

    def test_invalid_priority_negative(self):
        """Test that negative priority raises error."""
        with pytest.raises(ValueError):
            PendingURL(url="x", source="s", priority=-1)

    def test_auto_generates_id(self):
        """Test that ID is auto-generated."""
        pending = PendingURL(url="x", source="s")
        assert pending.id is not None
        UUID(pending.id)

    def test_auto_generates_discovered_at(self):
        """Test that discovered_at is auto-generated."""
        before = datetime.utcnow()
        pending = PendingURL(url="x", source="s")
        after = datetime.utcnow()
        
        assert before <= pending.discovered_at <= after


class TestExtractionResult:
    """Tests for ExtractionResult model."""

    def test_successful_result(self):
        """Test creating a successful extraction result."""
        card = OpportunityCard(url="x", title="t", summary="s")
        result = ExtractionResult(
            success=True,
            opportunity_card=card,
            confidence=0.9,
        )
        
        assert result.success is True
        assert result.opportunity_card is not None
        assert result.confidence == 0.9

    def test_failed_result(self):
        """Test creating a failed extraction result."""
        result = ExtractionResult(
            success=False,
            error="Page not found",
        )
        
        assert result.success is False
        assert result.error == "Page not found"
        assert result.opportunity_card is None

    def test_confidence_bounds(self):
        """Test confidence is bounded 0-1."""
        result = ExtractionResult(success=True, confidence=0.0)
        assert result.confidence == 0.0
        
        result = ExtractionResult(success=True, confidence=1.0)
        assert result.confidence == 1.0


class TestExtractionResponse:
    """Tests for ExtractionResponse schema."""

    def test_valid_response(self):
        """Test creating a valid extraction response."""
        response = ExtractionResponse(
            valid=True,
            title="Test Program",
            summary="A test program",
            category="STEM",
            opportunity_type="Competition",
        )
        
        assert response.valid is True
        assert response.title == "Test Program"

    def test_invalid_response(self):
        """Test creating an invalid extraction response."""
        response = ExtractionResponse(
            valid=False,
            reason="Not a program page, just a blog article",
        )
        
        assert response.valid is False
        assert response.reason is not None

    def test_default_values(self):
        """Test default values are set correctly."""
        response = ExtractionResponse(valid=True)
        
        assert response.content_type == "opportunity"
        assert response.timing_type == "one-time"
        assert response.appears_expired is False
        assert response.confidence == 0.5
        assert response.recheck_days == 14

    def test_confidence_bounds(self):
        """Test confidence is bounded 0-1."""
        response = ExtractionResponse(valid=True, confidence=0.0)
        assert response.confidence == 0.0
        
        response = ExtractionResponse(valid=True, confidence=1.0)
        assert response.confidence == 1.0

    def test_grade_levels_field(self):
        """Test grade_levels can be set."""
        response = ExtractionResponse(
            valid=True,
            grade_levels=[9, 10, 11, 12],
        )
        assert response.grade_levels == [9, 10, 11, 12]

    def test_date_fields(self):
        """Test date fields accept ISO format strings."""
        response = ExtractionResponse(
            valid=True,
            deadline="2026-03-15",
            start_date="2026-06-01",
            end_date="2026-08-15",
        )
        assert response.deadline == "2026-03-15"
        assert response.start_date == "2026-06-01"
        assert response.end_date == "2026-08-15"

    def test_tags_field(self):
        """Test tags can be set."""
        response = ExtractionResponse(
            valid=True,
            tags=["stem", "competition", "national"],
        )
        assert response.tags == ["stem", "competition", "national"]
