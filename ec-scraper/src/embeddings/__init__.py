"""Embeddings module with task-type optimization."""

from typing import List, Literal, Optional

from ..config import get_settings

# Try to import Gemini embeddings, but only use when api_mode="gemini"
try:
    from .gemini import GeminiEmbeddings, TaskType
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    TaskType = Literal["SEMANTIC_SIMILARITY", "CLASSIFICATION", "CLUSTERING", "RETRIEVAL_DOCUMENT", "RETRIEVAL_QUERY", "CODE_RETRIEVAL_QUERY", "QUESTION_ANSWERING", "FACT_VERIFICATION"]


class GroqEmbeddings:
    """Placeholder embeddings for Groq mode.

    Since Groq doesn't provide embeddings API, we use a simple
    keyword-based approach for compatibility when using Groq.
    """

    def __init__(self):
        """Initialize Groq embeddings (placeholder)."""
        settings = get_settings()
        self.model_name = "groq-placeholder"
        self.dimension = 768

    def generate(
        self,
        text: str,
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> List[float]:
        """Generate a simple embedding using keyword hashing (placeholder for Groq).

        Note: This is a simplified approach since Groq doesn't have
        a dedicated embeddings API. For production, consider using
        OpenAI embeddings or a local model.
        """
        import hashlib

        # Create a simple hash-based embedding for consistency
        # This isn't semantic but provides stable vector for same text
        hash_obj = hashlib.sha256(text.encode('utf-8'))
        hash_bytes = hash_obj.digest()

        # Convert to 768 float values (normalized)
        values = []
        for i in range(self.dimension):
            byte_index = i % len(hash_bytes)
            val = hash_bytes[byte_index] / 255.0
            values.append(val)

        return values

    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding optimized for search queries."""
        return self.generate(query, task_type="RETRIEVAL_QUERY")

    def classify_category(self, text: str) -> List[float]:
        """Generate CLASSIFICATION embedding for category detection."""
        return self.generate(text, task_type="CLASSIFICATION")

    def generate_for_similarity(self, text: str) -> List[float]:
        """Generate SEMANTIC_SIMILARITY embedding for comparison."""
        return self.generate(text, task_type="SEMANTIC_SIMILARITY")

    def generate_for_indexing(self, text: str) -> List[float]:
        """Generate RETRIEVAL_DOCUMENT embedding for vector storage."""
        return self.generate(text, task_type="RETRIEVAL_DOCUMENT")

    def generate_batch(
        self,
        texts: List[str],
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not texts:
            return []

        return [self.generate(text, task_type=task_type) for text in texts]


# Singleton instances
_gemini_embeddings_instance = None
_groq_embeddings_instance = None


def get_embeddings():
    """Get embeddings singleton based on api_mode setting.
    
    Defaults to Google Gemini embeddings (api_mode="gemini").
    """
    global _gemini_embeddings_instance, _groq_embeddings_instance
    
    settings = get_settings()
    
    # Default to Google Gemini embeddings
    if settings.api_mode == "groq":
        if _groq_embeddings_instance is None:
            _groq_embeddings_instance = GroqEmbeddings()
        return _groq_embeddings_instance
    else:
        # Default: Use Google Gemini embeddings
        if not GEMINI_AVAILABLE:
            raise ImportError("Google GenAI SDK not installed. Install with: pip install google-generativeai")
        
        if _gemini_embeddings_instance is None:
            _gemini_embeddings_instance = GeminiEmbeddings()
        return _gemini_embeddings_instance
