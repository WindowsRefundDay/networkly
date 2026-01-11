"""LangGraph-powered discovery agent for finding new EC opportunities."""

import asyncio
from dataclasses import dataclass, field
from typing import List, Optional, TypedDict
import json

from langgraph.graph import END, StateGraph

from ..config import get_settings
from ..db.models import PendingURL
from ..db.sqlite_db import get_sqlite_db
from ..llm import get_llm_provider, GenerationConfig


class DiscoveryState(TypedDict):
    """State for the discovery agent."""

    focus_area: str
    search_queries: List[str]
    discovered_urls: List[str]
    evaluated_urls: List[str]
    rejected_urls: List[str]
    iteration: int
    max_iterations: int
    target_url_count: int


# Query generation prompt
QUERY_GENERATION_PROMPT = """You are an expert at finding extracurricular opportunities for high school students.

Generate {num_queries} specific search queries to find {focus_area} opportunities.

The queries should:
1. Target specific programs, competitions, internships, camps, or volunteer opportunities
2. Include year qualifiers when relevant (e.g., "2026")
3. Use site operators to target educational domains when appropriate (e.g., site:.edu, site:.org)
4. Be diverse - cover different types of opportunities within the focus area
5. Target high school students specifically

Current iteration: {iteration} of {max_iterations}
URLs already found: {url_count}

Respond with ONLY a JSON array of search query strings, no markdown:
["query 1", "query 2", ...]"""


# URL evaluation prompt
URL_EVALUATION_PROMPT = """You are evaluating whether URLs contain legitimate extracurricular opportunities for high school students.

For each URL and snippet below, determine if it's likely to be:
- A real EC opportunity (competition, internship, camp, program, etc.)
- Targeting high school students
- Still active/current

URLs to evaluate:
{urls_with_snippets}

Respond with ONLY a JSON object mapping URLs to boolean (true = real opportunity):
{{"https://example.com": true, "https://blog.example.com": false}}"""


class DiscoveryAgent:
    """Agent that discovers new EC URLs using LangGraph."""

    def __init__(self):
        """Initialize the discovery agent."""
        self.provider = get_llm_provider()
        self.db = get_sqlite_db()
        self._graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state graph."""
        graph = StateGraph(DiscoveryState)

        # Add nodes
        graph.add_node("planner", self._planner_node)
        graph.add_node("searcher", self._searcher_node)
        graph.add_node("evaluator", self._evaluator_node)
        graph.add_node("saver", self._saver_node)

        # Add edges
        graph.set_entry_point("planner")
        graph.add_edge("planner", "searcher")
        graph.add_edge("searcher", "evaluator")
        graph.add_edge("evaluator", "saver")
        
        # Conditional edge: loop back or end
        graph.add_conditional_edges(
            "saver",
            self._should_continue,
            {
                "continue": "planner",
                "end": END,
            }
        )

        return graph.compile()

    async def _planner_node(self, state: DiscoveryState) -> dict:
        """Generate search queries based on focus area."""
        prompt = QUERY_GENERATION_PROMPT.format(
            num_queries=10,
            focus_area=state["focus_area"],
            iteration=state["iteration"],
            max_iterations=state["max_iterations"],
            url_count=len(state["discovered_urls"]),
        )

        try:
            config = GenerationConfig(
                temperature=0.7,
                max_output_tokens=1000,
            )
            
            response_text = await self.provider.generate(prompt, config)
            
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                response_text = "\n".join(lines[1:-1])
            
            queries = json.loads(response_text)
            return {"search_queries": queries}

        except Exception as e:
            print(f"Planner error: {e}")
            return {"search_queries": []}

    async def _searcher_node(self, state: DiscoveryState) -> dict:
        """Search for URLs using the generated queries using SearXNG."""
        from ..search.searxng_client import get_searxng_client
        
        search_client = get_searxng_client()
        all_discovered = list(state.get("discovered_urls", []))
        seen_urls = set(all_discovered)
        
        queries = state.get("search_queries", [])
        for query in queries:
            results = await search_client.search(query, max_results=5)
            for result in results:
                if result.url not in seen_urls:
                    seen_urls.add(result.url)
                    all_discovered.append(result.url)
                    
        return {"discovered_urls": all_discovered}

    async def _evaluator_node(self, state: DiscoveryState) -> dict:
        """Evaluate discovered URLs using LLM."""
        urls = state.get("discovered_urls", [])
        if not urls:
            return {"evaluated_urls": [], "rejected_urls": []}

        # For now, accept all URLs (real implementation would use LLM evaluation)
        return {
            "evaluated_urls": urls,
            "rejected_urls": [],
        }

    async def _saver_node(self, state: DiscoveryState) -> dict:
        """Save evaluated URLs to the pending queue."""
        evaluated_urls = state.get("evaluated_urls", [])
        
        for url in evaluated_urls:
            pending = PendingURL(
                url=url,
                source=f"discovery:{state['focus_area']}",
                priority=5,
            )
            self.db.add_pending_url(pending)

        return {"iteration": state["iteration"] + 1}

    def _should_continue(self, state: DiscoveryState) -> str:
        """Determine if we should continue the discovery loop."""
        if state["iteration"] >= state["max_iterations"]:
            return "end"
        if len(state["evaluated_urls"]) >= state["target_url_count"]:
            return "end"
        return "continue"

    async def run(
        self,
        focus_area: str,
        max_iterations: int = 3,
        target_url_count: int = 100,
    ) -> List[str]:
        """
        Run the discovery agent.
        
        Args:
            focus_area: Area to focus on (e.g., "STEM competitions")
            max_iterations: Maximum planning iterations
            target_url_count: Target number of URLs to find
            
        Returns:
            List of discovered and saved URLs
        """
        initial_state: DiscoveryState = {
            "focus_area": focus_area,
            "search_queries": [],
            "discovered_urls": [],
            "evaluated_urls": [],
            "rejected_urls": [],
            "iteration": 0,
            "max_iterations": max_iterations,
            "target_url_count": target_url_count,
        }

        final_state = await self._graph.ainvoke(initial_state)
        return final_state.get("evaluated_urls", [])


# Singleton
_discovery_instance: Optional[DiscoveryAgent] = None


def get_discovery_agent() -> DiscoveryAgent:
    """Get the discovery agent singleton."""
    global _discovery_instance
    if _discovery_instance is None:
        _discovery_instance = DiscoveryAgent()
    return _discovery_instance
