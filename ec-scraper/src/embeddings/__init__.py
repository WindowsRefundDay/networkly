"""Embeddings module with task-type optimization (Gemini only)."""

from typing import List, Literal

try:
    from .gemini import GeminiEmbeddings, TaskType
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    TaskType = Literal["SEMANTIC_SIMILARITY", "CLASSIFICATION", "CLUSTERING", "RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "CODE_RETRIEVAL_QUERY", "QUESTION_ANSWERING", "FACT_VERIFICATION"]


# Singleton instance
_gemini_embeddings_instance = None


def get_embeddings():
    """Get Gemini embeddings singleton."""
    global _gemini_embeddings_instance
    
    if not GEMINI_AVAILABLE:
        raise ImportError("Google GenAI SDK not installed. Install with: pip install google-generativeai")
    
    if _gemini_embeddings_instance is None:
        _gemini_embeddings_instance = GeminiEmbeddings()
    return _gemini_embeddings_instance
