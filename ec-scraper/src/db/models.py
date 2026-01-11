"""Pydantic models for EC Cards and related data structures."""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, HttpUrl


class ECCategory(str, Enum):
    """Categories for extracurricular activities."""

    STEM = "STEM"
    ARTS = "Arts"
    BUSINESS = "Business"
    LEADERSHIP = "Leadership"
    COMMUNITY_SERVICE = "Community Service"
    SPORTS = "Sports"
    HUMANITIES = "Humanities"
    LANGUAGE = "Language"
    MUSIC = "Music"
    DEBATE = "Debate"
    OTHER = "Other"


class ECType(str, Enum):
    """Types of extracurricular opportunities."""

    COMPETITION = "Competition"
    INTERNSHIP = "Internship"
    SUMMER_PROGRAM = "Summer Program"
    CAMP = "Camp"
    VOLUNTEER = "Volunteer"
    RESEARCH = "Research"
    CLUB = "Club"
    SCHOLARSHIP = "Scholarship"
    COURSE = "Course"
    WORKSHOP = "Workshop"
    CONFERENCE = "Conference"
    OTHER = "Other"


class LocationType(str, Enum):
    """Location types for activities."""

    IN_PERSON = "In-Person"
    ONLINE = "Online"
    HYBRID = "Hybrid"


class ECCard(BaseModel):
    """Schema for an extracurricular opportunity card."""

    # Identifiers
    id: str = Field(default_factory=lambda: str(uuid4()))
    url: str
    source_url: Optional[str] = None

    # Main Content
    title: str
    summary: str
    organization: Optional[str] = None

    # Classification
    category: ECCategory = ECCategory.OTHER
    suggested_category: Optional[str] = None  # AI-suggested category when 'Other' is used
    ec_type: ECType = ECType.OTHER
    tags: List[str] = Field(default_factory=list)

    # Eligibility
    grade_levels: List[int] = Field(default_factory=list)
    location_type: LocationType = LocationType.ONLINE
    location: Optional[str] = None

    # Dates & Logistics
    deadline: Optional[datetime] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cost: Optional[str] = None
    time_commitment: Optional[str] = None

    # Additional Details
    requirements: Optional[str] = None
    prizes: Optional[str] = None
    contact_email: Optional[str] = None
    application_url: Optional[str] = None

    # Metadata
    date_discovered: datetime = Field(default_factory=datetime.utcnow)
    date_updated: datetime = Field(default_factory=datetime.utcnow)
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    
    # AI-determined recheck interval (in days)
    # AI decides based on opportunity type: job=7, scholarship=30, event=3, etc.
    recheck_days: int = Field(default=14)

    def to_embedding_text(self) -> str:
        """Generate text for embedding creation."""
        parts = [
            self.title,
            self.summary,
            self.category.value,
            self.ec_type.value,
            " ".join(self.tags),
        ]
        if self.organization:
            parts.append(self.organization)
        if self.requirements:
            parts.append(self.requirements)
        return " ".join(filter(None, parts))


class PendingURL(BaseModel):
    """A URL pending scraping."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    url: str
    source: str  # Where we discovered this URL
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    priority: int = Field(default=0, ge=0, le=10)
    attempts: int = Field(default=0)
    last_attempt: Optional[datetime] = None
    status: str = Field(default="pending")  # pending, processing, completed, failed


class ExtractionResult(BaseModel):
    """Result from the extraction agent."""

    success: bool
    ec_card: Optional[ECCard] = None
    error: Optional[str] = None
    raw_content: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class ExtractionResponse(BaseModel):
    """Schema for LLM extraction response - used with Gemini structured output."""
    
    # Validation flag
    valid: bool = Field(description="Whether this is a valid extracurricular opportunity")
    reason: Optional[str] = Field(default=None, description="Reason for rejection if valid=false")
    
    # Main content (only required when valid=true)
    title: Optional[str] = Field(default=None, description="Name of the opportunity")
    summary: Optional[str] = Field(default=None, description="2-3 sentence description")
    organization: Optional[str] = Field(default=None, description="Hosting organization")
    
    # Classification
    category: Optional[str] = Field(default=None, description="Category: STEM, Arts, Business, Leadership, Community Service, Sports, Humanities, Language, Music, Debate, or Other")
    suggested_category: Optional[str] = Field(default=None, description="If category is 'Other', suggest a new category name (e.g., 'Entrepreneurship', 'Environmental', 'Healthcare')")
    ec_type: Optional[str] = Field(default=None, description="Type: Competition, Internship, Summer Program, Camp, Volunteer, Research, Club, Scholarship, Course, Workshop, Conference, or Other")
    tags: Optional[List[str]] = Field(default=None, description="Relevant tags")
    
    # Eligibility
    grade_levels: Optional[List[int]] = Field(default=None, description="Eligible grades (9-12)")
    location_type: Optional[str] = Field(default=None, description="In-Person, Online, or Hybrid")
    location: Optional[str] = Field(default=None, description="City/state if in-person")
    
    # Dates (ISO format strings)
    deadline: Optional[str] = Field(default=None, description="Application deadline in YYYY-MM-DD format")
    start_date: Optional[str] = Field(default=None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(default=None, description="End date in YYYY-MM-DD format")
    
    # Details
    cost: Optional[str] = Field(default=None, description="Cost (e.g., 'Free', '$500')")
    time_commitment: Optional[str] = Field(default=None, description="Time commitment (e.g., '10 hrs/week')")
    requirements: Optional[str] = Field(default=None, description="Eligibility requirements")
    prizes: Optional[str] = Field(default=None, description="Awards or prizes offered")
    contact_email: Optional[str] = Field(default=None, description="Contact email")
    application_url: Optional[str] = Field(default=None, description="Application URL")
    
    # Metadata
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="Extraction confidence score")
    recheck_days: int = Field(default=14, description="Days until recheck needed")
