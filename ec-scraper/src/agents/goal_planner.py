"""AI-powered goal planning agent for career roadmaps."""

import json
from typing import Dict, List, Optional
from dataclasses import dataclass

from ..llm import get_llm_provider, GenerationConfig


@dataclass
class RoadmapStep:
    """A single step in a career roadmap."""
    
    order: int
    title: str
    description: str
    timeframe: str  # e.g., "Next 1-2 months"
    opportunity_types: List[str]  # e.g., ["Internship", "Course"]


@dataclass
class GoalPlan:
    """A complete goal plan with roadmap and filters."""
    
    goal_text: str
    summary: str
    roadmap: List[RoadmapStep]
    recommended_categories: List[str]
    recommended_types: List[str]
    search_queries: List[str]


GOAL_PLANNING_PROMPT = """You are an expert career counselor helping students achieve their professional goals.

Given the following student profile and career goal, create a personalized roadmap.

STUDENT PROFILE:
- Skills: {skills}
- Interests: {interests}
- University: {university}
- Graduation Year: {graduation_year}
- Current Extracurriculars: {extracurriculars}

CAREER GOAL: {goal_text}

Create a detailed plan with:
1. A brief summary of the path to achieve this goal
2. 4-6 concrete steps with timeframes
3. Recommended opportunity categories to focus on
4. Recommended opportunity types to look for
5. Specific search queries to find relevant opportunities

Respond with ONLY valid JSON (no markdown):
{{
    "summary": "Brief 2-3 sentence summary of the path",
    "roadmap": [
        {{
            "order": 1,
            "title": "Step title",
            "description": "What to do and why",
            "timeframe": "Next 1-2 months",
            "opportunity_types": ["Internship", "Course"]
        }}
    ],
    "recommended_categories": ["STEM", "Research"],
    "recommended_types": ["Internship", "Research", "Competition"],
    "search_queries": ["biotech internship summer 2026", "research program biology"]
}}"""


class GoalPlannerAgent:
    """Agent that creates personalized career roadmaps using LLM provider."""
    
    def __init__(self):
        """Initialize the goal planner agent."""
        self.provider = get_llm_provider()
    
    async def create_plan(
        self,
        goal_text: str,
        user_profile: Dict,
    ) -> GoalPlan:
        """
        Create a career roadmap for a user's goal.
        
        Args:
            goal_text: The user's goal (e.g., "Get a summer internship in biotech")
            user_profile: Dict with skills, interests, etc.
            
        Returns:
            GoalPlan with roadmap and recommendations
        """
        prompt = GOAL_PLANNING_PROMPT.format(
            skills=", ".join(user_profile.get("skills", [])) or "Not specified",
            interests=", ".join(user_profile.get("interests", [])) or "Not specified",
            university=user_profile.get("university", "Not specified"),
            graduation_year=user_profile.get("graduationYear", "Not specified"),
            extracurriculars=user_profile.get("extracurriculars", "None listed"),
            goal_text=goal_text,
        )
        
        try:
            config = GenerationConfig(
                temperature=0.5,
                max_output_tokens=1500,
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
            
            roadmap = [
                RoadmapStep(
                    order=step.get("order", i + 1),
                    title=step.get("title", ""),
                    description=step.get("description", ""),
                    timeframe=step.get("timeframe", ""),
                    opportunity_types=step.get("opportunity_types", []),
                )
                for i, step in enumerate(data.get("roadmap", []))
            ]
            
            return GoalPlan(
                goal_text=goal_text,
                summary=data.get("summary", ""),
                roadmap=roadmap,
                recommended_categories=data.get("recommended_categories", []),
                recommended_types=data.get("recommended_types", []),
                search_queries=data.get("search_queries", []),
            )
            
        except json.JSONDecodeError as e:
            print(f"Goal plan parse error: {e}")
            return GoalPlan(
                goal_text=goal_text,
                summary="Unable to generate plan. Please try again.",
                roadmap=[],
                recommended_categories=[],
                recommended_types=[],
                search_queries=[goal_text],
            )
        except Exception as e:
            print(f"Goal planning error: {e}")
            return GoalPlan(
                goal_text=goal_text,
                summary=f"Error: {str(e)}",
                roadmap=[],
                recommended_categories=[],
                recommended_types=[],
                search_queries=[goal_text],
            )
    
    def plan_to_json(self, plan: GoalPlan) -> Dict:
        """Convert a GoalPlan to JSON-serializable dict."""
        return {
            "goalText": plan.goal_text,
            "summary": plan.summary,
            "roadmap": [
                {
                    "order": step.order,
                    "title": step.title,
                    "description": step.description,
                    "timeframe": step.timeframe,
                    "opportunityTypes": step.opportunity_types,
                }
                for step in plan.roadmap
            ],
            "recommendedCategories": plan.recommended_categories,
            "recommendedTypes": plan.recommended_types,
            "searchQueries": plan.search_queries,
        }


# Singleton
_planner_instance: Optional[GoalPlannerAgent] = None


def get_goal_planner() -> GoalPlannerAgent:
    """Get the goal planner agent singleton."""
    global _planner_instance
    if _planner_instance is None:
        _planner_instance = GoalPlannerAgent()
    return _planner_instance
