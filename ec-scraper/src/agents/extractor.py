"""Gemini-powered opportunity extraction agent with structured JSON output."""

import asyncio
from datetime import datetime
from typing import Optional

from ..config import get_settings
from ..db.models import (
    OpportunityCard,
    OpportunityCategory,
    OpportunityType,
    ContentType,
    ExtractionResponse,
    ExtractionResult,
    LocationType,
    OpportunityTiming,
)
from ..llm import get_llm_provider, GenerationConfig


EXTRACTION_PROMPT = """You are an expert at extracting information about opportunities for high school students.

Current date: January 16, 2026

Given the following webpage content, extract structured information about the opportunity.

VALIDATION RULES (Set valid=false only if):
- This is a ranking article listing MULTIPLE different programs (e.g. "Top 10 Internships", "15 Best Scholarships")
- This is a general directory or aggregator page without specific application details for a SINGLE program
- This is strictly a forum discussion (Reddit/Quora)
- This is a guide or advice article about opportunities (e.g. "How to get a summer internship")
- This is news/blog content discussing opportunities but not hosting or describing a specific program page
- This is clearly for Graduate/PhD students only (not High School)
- This is a 404 error page or "page not found"

ACCEPTABLE CONTENT (Set valid=true):
- Specific program landing pages (even if they are marketing/informational)
- University outreach program pages
- Scholarship application pages or descriptions
- Competition homepages
- "About" pages for specific organizations/clubs

EXTRACTION INSTRUCTIONS:
1. Classify the content_type:
   - opportunity: official program page, application page, competition homepage, scholarship listing
   - guide: how-to articles, advice posts, "ultimate guide" content
   - article: news/blog coverage, announcements without program details

2. Extract the MAIN opportunity described on the page ONLY if content_type=opportunity.

3. **DATE EXTRACTION IS CRITICAL** - Search extensively for dates in these formats:
   - Application deadline: "Apply by March 15, 2026", "Deadline: 3/15/26", "Applications due March 15"
   - Program dates: "June 1 - August 15", "Summer 2026", "July 2026"
   - Start/End dates: "Program runs June-August", "Begins Summer 2026"
   - Look in: application info, FAQs, timeline sections, headers, footers, sidebar widgets
   - Common phrases: "deadline", "apply by", "due date", "opens", "closes", "starts", "ends"
   - If NO specific date found but it's a summer program, infer: June 1 - August 15 for start/end
   - If scholarship with no deadline, check for "rolling" or "annual deadline"

4. If you find dates, extract ALL of them:
   - deadline: Application deadline in YYYY-MM-DD format
   - start_date: When program/opportunity begins in YYYY-MM-DD format  
   - end_date: When program/opportunity ends in YYYY-MM-DD format

5. Check if dates are in the PAST (e.g., 2025 or earlier when current year is 2026):
   - If so, set appears_expired=true

6. TIMING CLASSIFICATION:
   - "one-time": Single event, won't recur (e.g., specific workshop with fixed date)
   - "annual": Happens every year (e.g., Science Olympiad, annual hackathons, yearly contests, annual scholarships)
   - "recurring": Regular schedule (monthly meetings, quarterly programs)
   - "rolling": Rolling admissions, no fixed deadline
   - "ongoing": Always open (e.g., volunteer positions, club membership)
   - "seasonal": Seasonal pattern (summer programs, winter camps)

7. For annual/recurring opportunities where appears_expired=true, the program will run again next year.

8. For grade_levels, infer from "High School", "Secondary School", "9th-12th grade" -> [9, 10, 11, 12]

9. Use "Other" category if it doesn't fit perfectly, but provide a specific suggested_category.

10. Set confidence based on completeness:
   - 0.9+: Full details with specific dates, requirements, application info
   - 0.7-0.8: Good details, missing some dates or specifics
   - 0.5-0.6: Basic info, missing important details like dates or requirements
   - Below 0.5: Incomplete or uncertain information

WEBPAGE CONTENT:
---
{content}
---"""


class ExtractorAgent:
    """Agent that extracts opportunity information from webpage content using LLM provider."""

    def __init__(self):
        """Initialize the extractor."""
        self.provider = get_llm_provider()

    async def extract(
        self,
        content: str,
        url: str,
        source_url: Optional[str] = None,
        max_retries: int = 3,
    ) -> ExtractionResult:
        """
        Extract opportunity information from webpage content.
        
        Args:
            content: Markdown content from the webpage
            url: The URL being processed
            source_url: Where we discovered this URL
            max_retries: Maximum retry attempts for rate limiting
            
        Returns:
            ExtractionResult with extracted opportunity card or error
        """
        if not content or len(content.strip()) < 100:
            return ExtractionResult(
                success=False,
                error="Content too short or empty",
                raw_content=content,
            )

        # Truncate very long content to save tokens
        max_content_length = 15000
        truncated_content = content[:max_content_length]
        if len(content) > max_content_length:
            truncated_content += "\n\n[Content truncated...]"

        # Build prompt (use replace to avoid issues with curly braces in content)
        prompt = EXTRACTION_PROMPT.replace("{content}", truncated_content)

        # Retry loop with exponential backoff for rate limiting
        last_error = None
        for attempt in range(max_retries):
            try:
                return await self._do_extraction(
                    prompt=prompt,
                    url=url,
                    source_url=source_url,
                    truncated_content=truncated_content,
                )
            except Exception as e:
                last_error = e
                error_str = str(e)
                
                # Check for rate limiting (429 errors)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    if attempt < max_retries - 1:
                        # Try to extract retry delay from error message
                        import re
                        retry_match = re.search(r'retry in (\d+(?:\.\d+)?)', error_str.lower())
                        if retry_match:
                            wait_time = min(float(retry_match.group(1)) + 1, 60)  # Cap at 60s
                        else:
                            wait_time = (2 ** attempt) * 5 + 5  # 10, 25, 45 seconds
                        await asyncio.sleep(wait_time)
                        continue
                
                # For other errors, don't retry
                break

        # All retries exhausted or non-retryable error
        return ExtractionResult(
            success=False,
            error=str(last_error),
            raw_content=truncated_content[:1000],
        )

    async def _do_extraction(
        self,
        prompt: str,
        url: str,
        source_url: Optional[str],
        truncated_content: str,
    ) -> ExtractionResult:
        """Perform the actual extraction with structured output."""
        
        config = GenerationConfig(
            temperature=0.1,
            max_output_tokens=2000,
            use_fast_model=True,  # Use fast model for extraction
        )
        
        try:
            data = await self.provider.generate_structured(
                prompt=prompt,
                schema=ExtractionResponse,
                config=config,
            )
        except Exception as e:
            return ExtractionResult(
                success=False,
                error=f"Failed to parse response: {e}",
                raw_content=truncated_content[:500],
            )

        # Check if the content was validated as a real opportunity
        if not data.get("valid", True):
            reason = data.get("reason", "Content was not identified as a valid opportunity")
            return ExtractionResult(
                success=False,
                error=f"Rejected: {reason}",
                raw_content=truncated_content[:500],
            )

        content_type = (data.get("content_type") or "opportunity").lower()
        if content_type != ContentType.OPPORTUNITY.value:
            return ExtractionResult(
                success=False,
                error=f"Rejected: content_type={content_type}",
                raw_content=truncated_content[:500],
            )
        
        # Build Opportunity Card from the extracted data
        opportunity_card = self._build_opportunity_card(data, url, source_url)
        
        return ExtractionResult(
            success=True,
            opportunity_card=opportunity_card,
            confidence=data.get("confidence", 0.5),
            raw_content=truncated_content,
        )

    def _build_opportunity_card(
        self,
        data: dict,
        url: str,
        source_url: Optional[str],
    ) -> OpportunityCard:
        """Build an OpportunityCard from extracted data."""
        
        # Parse category
        category_str = data.get("category") or "Other"
        suggested_category = None
        try:
            category = OpportunityCategory(category_str)
        except ValueError:
            category = OpportunityCategory.OTHER
        
        # If category is Other, capture the suggested category name
        if category == OpportunityCategory.OTHER:
            suggested_category = data.get("suggested_category")

        # Parse opportunity type
        opportunity_type_str = data.get("opportunity_type") or data.get("ec_type") or "Other"
        try:
            opportunity_type = OpportunityType(opportunity_type_str)
        except ValueError:
            opportunity_type = OpportunityType.OTHER

        # Parse location type
        location_type_str = data.get("location_type") or "Online"
        try:
            location_type = LocationType(location_type_str)
        except ValueError:
            location_type = LocationType.ONLINE

        # Parse dates
        deadline = self._parse_date(data.get("deadline"))
        start_date = self._parse_date(data.get("start_date"))
        end_date = self._parse_date(data.get("end_date"))

        # Parse timing type
        timing_type_str = data.get("timing_type") or "one-time"
        try:
            timing_type = OpportunityTiming(timing_type_str)
        except ValueError:
            timing_type = OpportunityTiming.ONE_TIME

        # Determine if expired and calculate next cycle
        is_expired = False
        next_cycle_expected = None
        now = datetime.utcnow()

        if timing_type in [OpportunityTiming.ANNUAL, OpportunityTiming.RECURRING, OpportunityTiming.SEASONAL]:
            if deadline and deadline < now:
                is_expired = True
                next_cycle_expected = deadline.replace(year=deadline.year + 1)
            elif end_date and end_date < now:
                is_expired = True
                next_cycle_expected = end_date.replace(year=end_date.year + 1)
        elif timing_type == OpportunityTiming.ONE_TIME:
            if deadline and deadline < now:
                is_expired = True
            elif end_date and end_date < now:
                is_expired = True

        # Allow 30-day grace period for one-time opportunities
        if is_expired and timing_type == OpportunityTiming.ONE_TIME:
            grace_cutoff = now.replace(day=now.day - 30)
            if (deadline and deadline >= grace_cutoff) or (end_date and end_date >= grace_cutoff):
                is_expired = False

        # Safely parse lists
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            tags = []
        
        grade_levels = data.get("grade_levels") or []
        if not isinstance(grade_levels, list):
            grade_levels = []
        # Ensure all grade levels are integers
        grade_levels = [int(g) for g in grade_levels if isinstance(g, (int, float)) or (isinstance(g, str) and g.isdigit())]

        content_type_str = (data.get("content_type") or ContentType.OPPORTUNITY.value).lower()
        try:
            content_type = ContentType(content_type_str)
        except ValueError:
            content_type = ContentType.OPPORTUNITY

        return OpportunityCard(
            url=url,
            source_url=source_url,
            title=data.get("title") or "Unknown Opportunity",
            summary=data.get("summary") or "No summary available",
            organization=data.get("organization"),
            content_type=content_type,
            category=category,
            suggested_category=suggested_category,
            opportunity_type=opportunity_type,
            tags=tags,
            grade_levels=grade_levels,
            location_type=location_type,
            location=data.get("location"),
            deadline=deadline,
            start_date=start_date,
            end_date=end_date,
            cost=data.get("cost"),
            time_commitment=data.get("time_commitment"),
            requirements=data.get("requirements"),
            prizes=data.get("prizes"),
            contact_email=data.get("contact_email"),
            application_url=data.get("application_url"),
            extraction_confidence=data.get("confidence", 0.5),
            recheck_days=data.get("recheck_days", 14),
            timing_type=timing_type,
            is_expired=is_expired,
            next_cycle_expected=next_cycle_expected,
        )

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse a date string to datetime."""
        if not date_str:
            return None
        try:
            # Try ISO format first
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        except ValueError:
            try:
                # Try common formats
                for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%B %d, %Y"]:
                    try:
                        return datetime.strptime(date_str, fmt)
                    except ValueError:
                        continue
            except Exception:
                pass
        return None


# Singleton
_extractor_instance: Optional[ExtractorAgent] = None


def get_extractor() -> ExtractorAgent:
    """Get the extractor singleton."""
    global _extractor_instance
    if _extractor_instance is None:
        _extractor_instance = ExtractorAgent()
    return _extractor_instance
