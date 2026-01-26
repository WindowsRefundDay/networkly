"""AI-powered query generator using lite model for diverse search queries."""

from typing import List
import json
import re
from difflib import SequenceMatcher

from ..llm import get_llm_provider, GenerationConfig


QUERY_GENERATION_PROMPT = """You are an expert at generating diverse, specific search queries for finding high school opportunities.

Given a user's search intent, generate {count} unique, diverse search queries that will help find relevant opportunities.

User's search intent: "{user_query}"

REQUIREMENTS:
1. Generate queries across DIFFERENT categories:
   - Competitions (olympiads, contests, challenges)
   - Internships (summer, research, industry)
   - Summer Programs (camps, courses, workshops)
   - Scholarships (merit, need-based, field-specific)
   - Research Opportunities (labs, mentorship)
   - Volunteer Programs (community service, NGOs)

2. Make queries SPECIFIC and ACTIONABLE:
   - Include year/season when relevant (2026, summer)
   - Include target audience (high school, teenagers, students)
   - Include location hints when relevant (USA, online, remote)
   - Include application/registration terms

3. VARY the query patterns:
   - Some broad: "STEM internships high school 2026"
   - Some specific: "NASA summer research program application"
   - Some with organizations: "Science Olympiad registration"
   - Some with keywords: "coding competition teenagers deadline"

4. AVOID duplicates or near-duplicates
5. Focus on HIGH SCHOOL level opportunities only
6. Each query should be 5-10 words

Generate ONLY a JSON array of {count} search query strings. No explanations, no markdown.
Use strict JSON with double quotes and no trailing commas.

Example format:
["query 1", "query 2", "query 3", ...]
"""

CATEGORY_KEYWORDS = {
    "competitions": ["competition", "olympiad", "contest", "challenge"],
    "internships": ["internship", "intern", "industry"],
    "summer_programs": ["summer program", "camp", "workshop", "course"],
    "scholarships": ["scholarship", "award", "grant"],
    "research": ["research", "lab", "mentorship"],
    "volunteering": ["volunteer", "community service", "ngo", "nonprofit"],
}

CATEGORY_TEMPLATES = {
    "competitions": [
        "{focus} olympiad high school 2026",
        "{focus} competition for teenagers",
        "{focus} challenge high school registration",
    ],
    "internships": [
        "{focus} internship high school summer 2026",
        "paid {focus} internship teenagers",
        "remote {focus} internship students",
    ],
    "summer_programs": [
        "{focus} summer program high school",
        "university {focus} summer program",
        "{focus} camp for teenagers",
    ],
    "scholarships": [
        "{focus} scholarship high school students",
        "{focus} merit scholarship application",
        "{focus} scholarship competition 2026",
    ],
    "research": [
        "{focus} research opportunity high school",
        "{focus} science research program teenagers",
        "{focus} lab mentorship high school",
    ],
    "volunteering": [
        "{focus} volunteer opportunities youth",
        "{focus} community service program high school",
        "nonprofit {focus} volunteer high school",
    ],
    "general": [
        "high school {focus} opportunities 2026",
        "{focus} program for teenagers",
        "{focus} opportunities students apply now",
    ],
}


class QueryGenerator:
    """AI-powered query generator using lite model for fast, diverse queries."""
    
    def __init__(self):
        """Initialize the query generator."""
        self.provider = get_llm_provider()
    
    async def generate_queries(
        self,
        user_query: str,
        count: int = 10,
    ) -> List[str]:
        """
        Generate diverse search queries using AI.
        
        Args:
            user_query: User's original search intent
            count: Number of queries to generate
            
        Returns:
            List of diverse, specific search queries
        """
        if not user_query or len(user_query.strip()) < 3:
            # Fallback to generic queries
            return self._fallback_queries(user_query, count)
        
        # Build prompt
        prompt = QUERY_GENERATION_PROMPT.format(
            user_query=user_query.strip(),
            count=count,
        )
        
        try:
            # Use fast lite model for quick query generation
            config = GenerationConfig(
                temperature=0.8,  # Higher temp for more diversity
                max_output_tokens=500,
                use_fast_model=True,  # Use gemini-2.5-flash-lite
            )
            
            response = await self.provider.generate(prompt, config)
            
            # Clean response (remove markdown if present)
            response_text = response.strip()
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                # Remove first and last line (markdown fences)
                response_text = "\n".join(lines[1:-1])

            # Parse JSON (try extracting the JSON array if extra text appears)
            queries = self._parse_json_array(response_text)
            
            # Validate and clean
            if not isinstance(queries, list):
                raise ValueError("Response is not a list")
            
            # Filter and deduplicate (with near-duplicate detection)
            unique_queries = self._dedupe_queries(queries)
            
            # Ensure coverage across categories and sufficient count
            unique_queries = self._ensure_category_coverage(
                user_query,
                unique_queries,
                target_count=count,
            )
            
            return unique_queries[:count]
            
        except Exception as e:
            import sys
            sys.stderr.write(f"Query generation error: {e}\n")
            # Fallback to template-based queries
            return self._fallback_queries(user_query, count)
    
    def _fallback_queries(self, user_query: str, count: int) -> List[str]:
        """
        Generate fallback queries using templates when AI generation fails.
        
        Args:
            user_query: Original query
            count: Number of queries needed
            
        Returns:
            List of template-based queries
        """
        base = user_query.strip()
        templates: List[str] = []
        for items in CATEGORY_TEMPLATES.values():
            for template in items:
                templates.append(template.format(focus=base))
        return templates[:count]

    def _parse_json_array(self, response_text: str) -> List[str]:
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            match = re.search(r"\[[\s\S]*\]", response_text)
            if match:
                return json.loads(match.group(0))
            raise

    def _normalize_query(self, query: str) -> str:
        normalized = re.sub(r"[^a-z0-9\s]", " ", query.lower())
        normalized = re.sub(r"\s+", " ", normalized).strip()
        return normalized

    def _tokenize(self, query: str) -> List[str]:
        return [token for token in self._normalize_query(query).split() if token]

    def _is_near_duplicate(self, query: str, existing: List[str]) -> bool:
        query_norm = self._normalize_query(query)
        query_tokens = set(self._tokenize(query))
        for item in existing:
            item_norm = self._normalize_query(item)
            if query_norm == item_norm:
                return True
            ratio = SequenceMatcher(None, query_norm, item_norm).ratio()
            if ratio >= 0.86:
                return True
            item_tokens = set(self._tokenize(item))
            if query_tokens and item_tokens:
                overlap = len(query_tokens & item_tokens) / max(len(query_tokens), len(item_tokens))
                if overlap >= 0.8:
                    return True
        return False

    def _dedupe_queries(self, queries: List[str]) -> List[str]:
        unique_queries: List[str] = []
        for q in queries:
            if isinstance(q, str) and q.strip():
                q_clean = q.strip()
                if len(q_clean) < 10:
                    continue
                if not self._is_near_duplicate(q_clean, unique_queries):
                    unique_queries.append(q_clean)
        return unique_queries

    def _categorize_query(self, query: str) -> str:
        query_lower = query.lower()
        for category, keywords in CATEGORY_KEYWORDS.items():
            if any(keyword in query_lower for keyword in keywords):
                return category
        return "general"

    def _ensure_category_coverage(
        self,
        user_query: str,
        queries: List[str],
        target_count: int,
    ) -> List[str]:
        base = user_query.strip()
        categorized = {category: [] for category in CATEGORY_KEYWORDS.keys()}
        categorized["general"] = []
        for query in queries:
            categorized[self._categorize_query(query)].append(query)

        required_categories = [
            "competitions",
            "internships",
            "summer_programs",
            "scholarships",
            "research",
            "volunteering",
        ]

        filled = list(queries)
        for category in required_categories:
            if len(filled) >= target_count:
                break
            if categorized.get(category):
                continue
            for template in CATEGORY_TEMPLATES.get(category, []):
                candidate = template.format(focus=base)
                if not self._is_near_duplicate(candidate, filled):
                    filled.append(candidate)
                    categorized[category].append(candidate)
                    break

        if len(filled) < max(5, min(target_count, 6)):
            fallback = self._fallback_queries(user_query, target_count - len(filled))
            for candidate in fallback:
                if len(filled) >= target_count:
                    break
                if not self._is_near_duplicate(candidate, filled):
                    filled.append(candidate)

        return filled


# Singleton
_generator_instance = None


def get_query_generator() -> QueryGenerator:
    """Get the query generator singleton."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = QueryGenerator()
    return _generator_instance
