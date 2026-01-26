"""Gemini embedding generation with task-type optimization."""

from typing import List, Literal, Optional

import numpy as np
from google import genai
from google.genai import types

from ..config import get_settings


# Task types for Gemini embeddings
TaskType = Literal[
    "SEMANTIC_SIMILARITY",
    "CLASSIFICATION",
    "CLUSTERING",
    "RETRIEVAL_DOCUMENT",
    "RETRIEVAL_QUERY",
    "CODE_RETRIEVAL_QUERY",
    "QUESTION_ANSWERING",
    "FACT_VERIFICATION",
]


class GeminiEmbeddings:
    """Generate embeddings using Gemini API with task-type optimization.
    
    Task types optimize embeddings for specific use cases:
    - CLASSIFICATION: Categorizing content (e.g., EC category detection)
    - SEMANTIC_SIMILARITY: Comparing text similarity
    - RETRIEVAL_DOCUMENT: Optimized for document indexing
    - RETRIEVAL_QUERY: Optimized for search queries
    """

    def __init__(self):
        """Initialize Gemini embeddings."""
        settings = get_settings()
        
        # Initialize client based on Vertex AI mode
        if settings.use_vertex_ai:
            # Validate Vertex configuration
            if not settings.vertex_project_id:
                raise ValueError(
                    "VERTEX_PROJECT_ID is required when USE_VERTEX_AI=true. "
                    "Set it in your .env file or environment variables."
                )
            
            # Use Vertex AI with IAM authentication
            self.client = genai.Client(
                vertexai=True,
                project=settings.vertex_project_id,
                location=settings.vertex_location,
            )
        else:
            # Use Gemini Developer API with API key
            if not settings.GOOGLE_API_KEY:
                raise ValueError(
                    "GOOGLE_API_KEY is required when USE_VERTEX_AI=false. "
                    "Set it in your .env file or use Vertex AI mode."
                )
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        
        self.model_name = settings.embedding_model
        self.dimension = settings.embedding_dimension

    def generate(
        self,
        text: str,
        task_type: TaskType = "RETRIEVAL_DOCUMENT",
    ) -> List[float]:
        """Generate embedding with task-type optimization.
        
        Args:
            text: Text to embed
            task_type: Optimization hint for embedding generation
            
        Returns:
            List of embedding values
        """
        result = self.client.models.embed_content(
            model=self.model_name,
            contents=text,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=self.dimension,
            ),
        )
        
        embedding = result.embeddings[0].values
        
        # Normalize for non-3072 dimensions (required for accurate similarity)
        if self.dimension != 3072:
            embedding = self._normalize(embedding)
        
        return embedding

    def generate_query_embedding(self, query: str) -> List[float]:
        """Generate embedding optimized for search queries."""
        return self.generate(query, task_type="RETRIEVAL_QUERY")

    def classify_category(self, text: str) -> List[float]:
        """Generate CLASSIFICATION embedding for category detection.
        
        Use this when you want to categorize/classify content based on
        semantic meaning (e.g., determining if an EC is STEM, Arts, etc.)
        """
        return self.generate(text, task_type="CLASSIFICATION")

    def generate_for_similarity(self, text: str) -> List[float]:
        """Generate SEMANTIC_SIMILARITY embedding for comparison.
        
        Use this when comparing two pieces of text for meaning similarity.
        """
        return self.generate(text, task_type="SEMANTIC_SIMILARITY")

    def generate_for_indexing(self, text: str) -> List[float]:
        """Generate RETRIEVAL_DOCUMENT embedding for vector storage.
        
        Use this when storing documents for later retrieval via search.
        """
        return self.generate(text, task_type="RETRIEVAL_DOCUMENT")

    def generate_batch(
        self,
        texts: List[str],
        task_type: TaskType = "RETRIEVAL_DOCUMENT",
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
            task_type: Optimization hint for all embeddings
            
        Returns:
            List of embedding vectors
        """
        if not texts:
            return []
        
        result = self.client.models.embed_content(
            model=self.model_name,
            contents=texts,
            config=types.EmbedContentConfig(
                task_type=task_type,
                output_dimensionality=self.dimension,
            ),
        )
        
        embeddings = []
        for emb in result.embeddings:
            values = emb.values
            if self.dimension != 3072:
                values = self._normalize(values)
            embeddings.append(values)
        
        return embeddings

    def _normalize(self, embedding: List[float]) -> List[float]:
        """Normalize embedding vector to unit length.
        
        Required for non-3072 dimensions to ensure accurate cosine similarity.
        """
        arr = np.array(embedding)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()


# Singleton
_embeddings_instance: Optional[GeminiEmbeddings] = None


def get_embeddings() -> GeminiEmbeddings:
    """Get the embeddings singleton."""
    global _embeddings_instance
    if _embeddings_instance is None:
        _embeddings_instance = GeminiEmbeddings()
    return _embeddings_instance
