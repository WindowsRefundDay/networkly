"""Gemini-powered EC extraction agent with structured JSON output."""

import asyncio
from datetime import datetime
from typing import Optional

from ..config import get_settings
from ..db.models import (
    ECCard,
    ECCategory,
    ECType,
    ExtractionResponse,
    ExtractionResult,
    LocationType,
)
from ..llm import get_llm_provider, GenerationConfig


# Simplified extraction prompt - schema is handled by response_schema
EXTRACTION_PROMPT = """You are an expert at extracting information about extracurricular opportunities for high school students.

Given the following webpage content, extract structured information about the extracurricular opportunity.

CRITICAL VALIDATION - Set valid=false if ANY of these apply:
- This is a discussion forum, blog post, or Reddit thread (NOT an opportunity)
- This is a ranking/list article (e.g., "Best 94 schools for...") - informational, NOT an opportunity
- This is a news article or press release about opportunities in general
- This is a generic informational page without a specific program to apply for
- There is no clear application process, deadline, or way to participate
- The page is primarily advertising or promotional content
- This is for graduate students or professionals only (not high school students)

EXTRACTION RULES for valid opportunities:
1. A valid opportunity is a SPECIFIC program that students can apply to or participate in
2. Examples: internships, scholarships, competitions, summer programs, research programs, fellowships
3. Only extract information explicitly stated in the content
4. Use null for fields that cannot be determined
5. For grade_levels, use integers 9-12 for high school grades
6. Extract dates in ISO format (YYYY-MM-DD)
7. Set confidence LOW (0.3-0.5) if the opportunity seems vague or incomplete
8. Set recheck_days based on opportunity type:
   - Job postings/Internships with rolling deadlines: 7 days
   - Events/Competitions with fixed dates: 3 days
   - Scholarships: 14-30 days
   - Annual programs: 30 days

CATEGORY CLASSIFICATION:
- Choose from: STEM, Arts, Business, Leadership, Community Service, Sports, Humanities, Language, Music, Debate, or Other
- If "Other" is chosen, you MUST provide suggested_category with a descriptive name like:
  "Entrepreneurship", "Environmental", "Healthcare", "Technology", "Social Impact", "Media/Journalism", etc.

WEBPAGE CONTENT:
---
{content}
---"""


class ExtractorAgent:
    """Agent that extracts EC information from webpage content using LLM provider."""

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
        Extract EC information from webpage content.
        
        Args:
            content: Markdown content from the webpage
            url: The URL being processed
            source_url: Where we discovered this URL
            max_retries: Maximum retry attempts for rate limiting
            
        Returns:
            ExtractionResult with extracted EC card or error
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

        # Build EC Card from the extracted data
        ec_card = self._build_ec_card(data, url, source_url)
        
        return ExtractionResult(
            success=True,
            ec_card=ec_card,
            confidence=data.get("confidence", 0.5),
            raw_content=truncated_content,
        )

    def _build_ec_card(
        self,
        data: dict,
        url: str,
        source_url: Optional[str],
    ) -> ECCard:
        """Build an ECCard from extracted data."""
        
        # Parse category
        category_str = data.get("category") or "Other"
        suggested_category = None
        try:
            category = ECCategory(category_str)
        except ValueError:
            category = ECCategory.OTHER
        
        # If category is Other, capture the suggested category name
        if category == ECCategory.OTHER:
            suggested_category = data.get("suggested_category")

        # Parse EC type
        ec_type_str = data.get("ec_type") or "Other"
        try:
            ec_type = ECType(ec_type_str)
        except ValueError:
            ec_type = ECType.OTHER

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

        # Safely parse lists
        tags = data.get("tags") or []
        if not isinstance(tags, list):
            tags = []
        
        grade_levels = data.get("grade_levels") or []
        if not isinstance(grade_levels, list):
            grade_levels = []
        # Ensure all grade levels are integers
        grade_levels = [int(g) for g in grade_levels if isinstance(g, (int, float)) or (isinstance(g, str) and g.isdigit())]

        return ECCard(
            url=url,
            source_url=source_url,
            title=data.get("title") or "Unknown Opportunity",
            summary=data.get("summary") or "No summary available",
            organization=data.get("organization"),
            category=category,
            suggested_category=suggested_category,
            ec_type=ec_type,
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
