"""AI-powered opportunity summarizer with dead link detection."""

import asyncio
import time
from typing import Optional, Tuple
from ..crawlers.hybrid_crawler import get_hybrid_crawler
from ..llm import get_llm_provider, GenerationConfig
from ..db.models import OpportunitySummary
from ..utils.html_cleaner import clean_html_for_llm


SUMMARIZATION_PROMPT_TEMPLATE = """You are analyzing an opportunity page to generate a structured summary.

URL: {url}

PAGE CONTENT:
{content}

TASK: Extract a concise summary with these fields:

1. **eligibility**: Who can apply? Include grade level, location restrictions, GPA requirements. Be specific.
2. **value_prop**: Why should someone apply? Mention prizes, learning outcomes, networking, college admissions boost. Max 2 sentences.
3. **difficulty_level**:
   - "beginner": Open to all, no prerequisites
   - "intermediate": Some experience/skills required
   - "advanced": Highly selective, significant background needed
4. **deadline_status**:
   - "urgent": Deadline within 7 days
   - "soon": Deadline 7-30 days away
   - "flexible": >30 days away or rolling admissions
   - "expired": Deadline has passed
5. **one_sentence_summary**: Ultra-concise description, max 20 words
6. **is_expired**: true if page is a 404, access denied, or clearly states opportunity has ended
7. **extraction_confidence**:
   - 1.0 = All info clearly stated on page
   - 0.7 = Some inference required
   - 0.4 = Minimal info, high uncertainty
   - 0.0 = Cannot determine, likely hallucinating

If the page is expired/invalid, set is_expired=true and extraction_confidence=0.0.
Only provide information that is clearly stated or directly inferable from the page content. Do not make assumptions.
"""


class OpportunitySummarizer:
    """Generates JIT summaries for opportunity pages."""

    def __init__(self):
        self.crawler = get_hybrid_crawler()
        self.llm = get_llm_provider()

    async def summarize(
        self,
        url: str,
        timeout_seconds: int = 15
    ) -> Tuple[bool, Optional[OpportunitySummary], Optional[str]]:
        """
        Fetch URL and generate summary.

        Returns:
            (success, summary, error_message)
        """
        start_time = time.time()

        try:
            # Step 1: Crawl with timeout
            crawl_result = await asyncio.wait_for(
                self.crawler.crawl(url),
                timeout=timeout_seconds
            )

            if not crawl_result.success:
                # Dead link detection
                return (True, OpportunitySummary(
                    eligibility="Unknown (page unavailable)",
                    value_prop="Could not access page",
                    difficulty_level="intermediate",
                    deadline_status="expired",
                    one_sentence_summary="Page could not be loaded",
                    is_expired=True,
                    extraction_confidence=0.0
                ), None)

            # Step 2: Clean HTML
            if crawl_result.html:
                cleaned_text = clean_html_for_llm(crawl_result.html, max_chars=8000)
            elif crawl_result.markdown:
                cleaned_text = crawl_result.markdown[:8000]
            else:
                return (False, None, "No content extracted from page")

            if len(cleaned_text) < 100:
                # Too little content
                return (True, OpportunitySummary(
                    eligibility="Unknown (insufficient content)",
                    value_prop="Page has minimal content",
                    difficulty_level="intermediate",
                    deadline_status="expired",
                    one_sentence_summary="Insufficient page content",
                    is_expired=True,
                    extraction_confidence=0.0
                ), None)

            # Step 3: Gemini extraction with structured output
            prompt = SUMMARIZATION_PROMPT_TEMPLATE.format(
                url=url,
                content=cleaned_text
            )

            config = GenerationConfig(
                temperature=0.1,  # Low temp for factual extraction
                max_output_tokens=1024,
                use_fast_model=True  # Use Flash for speed
            )

            result = await self.llm.generate_structured(
                prompt=prompt,
                schema=OpportunitySummary,
                config=config
            )

            summary = OpportunitySummary(**result)

            # Hallucination check: if confidence < 0.3, mark as expired
            if summary.extraction_confidence < 0.3:
                summary.is_expired = True

            elapsed_ms = int((time.time() - start_time) * 1000)
            print(f"[Summarizer] {url} completed in {elapsed_ms}ms (confidence: {summary.extraction_confidence})")

            return (True, summary, None)

        except asyncio.TimeoutError:
            # Timeout = likely dead link
            return (True, OpportunitySummary(
                eligibility="Unknown (timeout)",
                value_prop="Page took too long to load",
                difficulty_level="intermediate",
                deadline_status="expired",
                one_sentence_summary="Page request timed out",
                is_expired=True,
                extraction_confidence=0.0
            ), None)

        except Exception as e:
            return (False, None, str(e)[:200])


# Singleton
_summarizer: Optional[OpportunitySummarizer] = None

def get_summarizer() -> OpportunitySummarizer:
    """Get summarizer singleton."""
    global _summarizer
    if _summarizer is None:
        _summarizer = OpportunitySummarizer()
    return _summarizer
