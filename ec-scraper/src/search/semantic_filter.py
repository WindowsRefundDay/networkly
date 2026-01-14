"""Semantic search result filtering using embeddings.

Uses Google Gemini text-embedding-005 with batch embedding for speed.
Based on official Google GenAI Python SDK documentation.
"""

import sys
import numpy as np
from typing import List, Tuple, Optional

from google import genai
from google.genai import types

from ..config import get_settings


# Reference text representing ideal opportunities (combined for one embedding)
REFERENCE_TEXT = """
high school student internship program application deadline summer 2026
scholarship competition for teenagers research opportunity apply now
STEM summer camp program for high school students registration open
youth leadership program college prep academic enrichment opportunity
science olympiad math competition robotics challenge for students
research mentorship program for underrepresented high schoolers
volunteer community service program for teens nonprofit organization
NASA science program for high school students application
university pre-college summer program admissions deadline
coding bootcamp hackathon for teenage developers
"""


class SemanticFilter:
    """Filter search results using embedding similarity.
    
    Uses Gemini text-embedding-005 with SEMANTIC_SIMILARITY task type
    and batch embedding for maximum speed.
    """
    
    def __init__(self, similarity_threshold: float = 0.55):
        """
        Initialize semantic filter.
        
        Args:
            similarity_threshold: Minimum cosine similarity to keep (0-1)
                0.55+ is recommended to filter out generic/irrelevant content
        """
        self.threshold = similarity_threshold
        self._client = None
        self._model = None
        self._reference_embedding = None
    
    def _get_client(self):
        """Lazy-load the Gemini client."""
        if self._client is None:
            settings = get_settings()
            if not settings.GOOGLE_API_KEY:
                raise ValueError("GOOGLE_API_KEY not set")
            self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self._model = settings.embedding_model  # text-embedding-005
        return self._client
    
    def _get_reference_embedding(self) -> np.ndarray:
        """Get cached reference embedding for ideal opportunities."""
        if self._reference_embedding is None:
            client = self._get_client()
            response = client.models.embed_content(
                model=self._model,
                contents=[REFERENCE_TEXT],
                config=types.EmbedContentConfig(
                    task_type='SEMANTIC_SIMILARITY',
                    output_dimensionality=256,  # Smaller for speed
                ),
            )
            self._reference_embedding = np.array(response.embeddings[0].values)
        return self._reference_embedding
    
    def _cosine_similarity_batch(
        self,
        embeddings: List[np.ndarray],
        reference: np.ndarray,
    ) -> List[float]:
        """Calculate cosine similarity for all embeddings vs reference."""
        if not embeddings:
            return []
        
        # Stack into matrix for vectorized operation
        emb_matrix = np.vstack(embeddings)
        
        # Normalize embeddings
        norms = np.linalg.norm(emb_matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1  # Avoid division by zero
        emb_matrix = emb_matrix / norms
        
        # Normalize reference
        ref_norm = np.linalg.norm(reference)
        if ref_norm == 0:
            return [0.0] * len(embeddings)
        ref_normalized = reference / ref_norm
        
        # Dot product gives cosine similarity
        similarities = emb_matrix @ ref_normalized
        return similarities.tolist()
    
    async def filter_results(
        self,
        results: List[Tuple[str, str, str]],  # (url, title, snippet)
        max_results: int = 35,
    ) -> List[Tuple[str, float]]:
        """
        Filter search results by semantic similarity.
        
        Uses ONE batch API call for all texts (fast).
        
        Args:
            results: List of (url, title, snippet) tuples
            max_results: Maximum results to return
            
        Returns:
            List of (url, similarity_score) for results above threshold
        """
        if not results:
            return []
        
        try:
            client = self._get_client()
            
            # Get reference embedding (cached)
            reference = self._get_reference_embedding()
            
            # Prepare texts for batch embedding (truncate snippets for speed)
            texts_to_embed = [
                f"{title} {snippet[:200]}" 
                for _, title, snippet in results
            ]
            
            # BATCH EMBED - One API call for ALL texts
            response = client.models.embed_content(
                model=self._model,
                contents=texts_to_embed,
                config=types.EmbedContentConfig(
                    task_type='SEMANTIC_SIMILARITY',
                    output_dimensionality=256,
                ),
            )
            
            # Extract embeddings
            embeddings = [np.array(e.values) for e in response.embeddings]
            
            # Calculate similarities (vectorized for speed)
            similarities = self._cosine_similarity_batch(embeddings, reference)
            
            # Filter and score
            scored_results = []
            for i, (url, title, snippet) in enumerate(results):
                similarity = similarities[i]
                if similarity >= self.threshold:
                    scored_results.append((url, similarity, title))
            
            # Sort by similarity descending
            scored_results.sort(key=lambda x: x[1], reverse=True)
            
            # Log stats
            sys.stderr.write(
                f"[SemanticFilter] {len(results)} → {len(scored_results)} "
                f"(threshold={self.threshold})\n"
            )
            
            return [(url, score) for url, score, _ in scored_results[:max_results]]
            
        except Exception as e:
            sys.stderr.write(f"[SemanticFilter] Error: {e}\n")
            # Return all results if filtering fails (fallback)
            raise
    
    def filter_results_sync(
        self,
        results: List[Tuple[str, str, str]],
        max_results: int = 35,
    ) -> List[Tuple[str, float]]:
        """Synchronous version of filter_results."""
        import asyncio
        return asyncio.run(self.filter_results(results, max_results))


# Singleton
_filter_instance: Optional[SemanticFilter] = None


def get_semantic_filter() -> SemanticFilter:
    """Get the semantic filter singleton."""
    global _filter_instance
    if _filter_instance is None:
        _filter_instance = SemanticFilter()
    return _filter_instance
