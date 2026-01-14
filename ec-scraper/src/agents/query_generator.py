"""AI-powered query generator using lite model for diverse search queries."""

from typing import List
import json

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

Example format:
["query 1", "query 2", "query 3", ...]
"""


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
            
            # Parse JSON
            queries = json.loads(response_text)
            
            # Validate and clean
            if not isinstance(queries, list):
                raise ValueError("Response is not a list")
            
            # Filter and deduplicate
            unique_queries = []
            seen = set()
            for q in queries:
                if isinstance(q, str) and q.strip():
                    q_clean = q.strip()
                    q_lower = q_clean.lower()
                    if q_lower not in seen and len(q_clean) > 10:
                        unique_queries.append(q_clean)
                        seen.add(q_lower)
            
            # Ensure we have at least some queries
            if len(unique_queries) < 5:
                fallback = self._fallback_queries(user_query, count - len(unique_queries))
                unique_queries.extend(fallback)
            
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
        
        templates = [
            f"high school {base} 2026",
            f"{base} internship for teenagers",
            f"{base} competition registration",
            f"{base} summer program application",
            f"{base} scholarship high school students",
            f"{base} research opportunity",
            f"best {base} programs high school",
            f"{base} volunteer opportunities youth",
            f"{base} olympiad competition",
            f"online {base} program for students",
        ]
        
        return templates[:count]


# Singleton
_generator_instance = None


def get_query_generator() -> QueryGenerator:
    """Get the query generator singleton."""
    global _generator_instance
    if _generator_instance is None:
        _generator_instance = QueryGenerator()
    return _generator_instance
