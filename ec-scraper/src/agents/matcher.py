"""AI-powered opportunity matching agent."""

import json
from typing import Dict, List, Optional
from dataclasses import dataclass

from ..llm import get_llm_provider, GenerationConfig


@dataclass
class MatchResult:
    """Result of matching an opportunity to a user profile."""
    
    opportunity_id: str
    score: int  # 0-100
    reasons: List[str]
    recommendation: str  # "Strong Match", "Good Match", "Fair Match", "Weak Match"


MATCHING_PROMPT = """You are an expert career counselor matching opportunities to student profiles.

Given the following student profile and opportunity, calculate a match score (0-100) and explain why.

STUDENT PROFILE:
- Skills: {skills}
- Interests: {interests}
- Location: {location}
- University: {university}
- Graduation Year: {graduation_year}
- Goal: {goal}

OPPORTUNITY:
- Title: {opp_title}
- Type: {opp_type}
- Category: {opp_category}
- Location: {opp_location}
- Remote: {opp_remote}
- Description: {opp_description}
- Requirements: {opp_requirements}
- Skills: {opp_skills}

SCORING CRITERIA:
1. Skill alignment (0-30 points): How well do the student's skills match the opportunity?
2. Interest alignment (0-25 points): Does this match the student's interests?
3. Eligibility (0-25 points): Does the student meet the requirements?
4. Goal alignment (0-20 points): Does this help achieve the student's career goal?

Respond with ONLY valid JSON (no markdown):
{{
    "score": <0-100>,
    "reasons": ["reason 1", "reason 2", "reason 3"],
    "recommendation": "Strong Match" | "Good Match" | "Fair Match" | "Weak Match"
}}"""


class MatchingAgent:
    """Agent that matches opportunities to user profiles using LLM provider."""
    
    def __init__(self):
        """Initialize the matching agent."""
        self.provider = get_llm_provider()
    
    async def match(
        self,
        user_profile: Dict,
        opportunity: Dict,
    ) -> MatchResult:
        """
        Calculate match score between a user and an opportunity.
        
        Args:
            user_profile: Dict with skills, interests, location, etc.
            opportunity: Dict with title, type, description, etc.
            
        Returns:
            MatchResult with score and reasons
        """
        prompt = MATCHING_PROMPT.format(
            skills=", ".join(user_profile.get("skills", [])) or "Not specified",
            interests=", ".join(user_profile.get("interests", [])) or "Not specified",
            location=user_profile.get("location", "Not specified"),
            university=user_profile.get("university", "Not specified"),
            graduation_year=user_profile.get("graduationYear", "Not specified"),
            goal=user_profile.get("goal", "General career growth"),
            opp_title=opportunity.get("title", "Unknown"),
            opp_type=opportunity.get("type", "Unknown"),
            opp_category=opportunity.get("category", "Other"),
            opp_location=opportunity.get("location", "Not specified"),
            opp_remote="Yes" if opportunity.get("remote") else "No",
            opp_description=opportunity.get("description", "")[:500],
            opp_requirements=opportunity.get("requirements", "None specified"),
            opp_skills=", ".join(opportunity.get("skills", [])) or "Not specified",
        )
        
        try:
            config = GenerationConfig(
                temperature=0.2,
                max_output_tokens=500,
                use_fast_model=True,
            )
            
            response_text = await self.provider.generate(prompt, config)
            
            # Clean up markdown if present
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                if lines[-1].strip() == "```":
                    lines = lines[1:-1]
                else:
                    lines = lines[1:]
                response_text = "\n".join(lines)
            
            data = json.loads(response_text)
            
            return MatchResult(
                opportunity_id=opportunity.get("id", ""),
                score=min(100, max(0, int(data.get("score", 50)))),
                reasons=data.get("reasons", []),
                recommendation=data.get("recommendation", "Fair Match"),
            )
            
        except json.JSONDecodeError as e:
            print(f"Match response parse error: {e}")
            return MatchResult(
                opportunity_id=opportunity.get("id", ""),
                score=50,
                reasons=["Unable to analyze match"],
                recommendation="Fair Match",
            )
        except Exception as e:
            print(f"Matching error: {e}")
            return MatchResult(
                opportunity_id=opportunity.get("id", ""),
                score=0,
                reasons=[f"Error: {str(e)}"],
                recommendation="Weak Match",
            )
    
    async def match_batch(
        self,
        user_profile: Dict,
        opportunities: List[Dict],
    ) -> List[MatchResult]:
        """
        Match multiple opportunities for a user.
        
        Args:
            user_profile: User profile dictionary
            opportunities: List of opportunity dictionaries
            
        Returns:
            List of MatchResults sorted by score descending
        """
        results = []
        for opp in opportunities:
            result = await self.match(user_profile, opp)
            results.append(result)
        
        # Sort by score descending
        results.sort(key=lambda x: x.score, reverse=True)
        return results


# Singleton
_matcher_instance: Optional[MatchingAgent] = None


def get_matching_agent() -> MatchingAgent:
    """Get the matching agent singleton."""
    global _matcher_instance
    if _matcher_instance is None:
        _matcher_instance = MatchingAgent()
    return _matcher_instance
