"""ChromaDB vector database for semantic search."""

from pathlib import Path
from typing import List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings

from ..config import get_settings
from .models import OpportunityCard


class VectorDB:
    """ChromaDB manager for vector similarity search."""

    COLLECTION_NAME = "opportunities"

    def __init__(self, db_path: Optional[Path] = None):
        """Initialize ChromaDB."""
        self.db_path = db_path or get_settings().chroma_path
        self._client = chromadb.PersistentClient(
            path=str(self.db_path),
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True,
            ),
        )
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )

    def add_embedding(
        self,
        opportunity_id: str,
        embedding: List[float],
        metadata: Optional[dict] = None,
    ) -> None:
        """Add or update an embedding for an opportunity."""
        self._collection.upsert(
            ids=[opportunity_id],
            embeddings=[embedding],
            metadatas=[metadata] if metadata else None,
        )

    def add_opportunity_with_embedding(
        self,
        opportunity: OpportunityCard,
        embedding: List[float],
    ) -> None:
        """Add an opportunity card with its embedding."""
        metadata = {
            "title": opportunity.title,
            "category": opportunity.category.value,
            "opportunity_type": opportunity.opportunity_type.value,
            "url": opportunity.url,
        }
        self.add_embedding(opportunity.id, embedding, metadata)

    def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[Tuple[str, float, dict]]:
        """
        Search for similar opportunities by embedding.
        
        Returns list of (id, distance, metadata) tuples.
        """
        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}

        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=limit,
            where=where_filter,
            include=["distances", "metadatas"],
        )

        # Combine results
        output = []
        if results["ids"] and results["ids"][0]:
            ids = results["ids"][0]
            distances = results["distances"][0] if results["distances"] else [0] * len(ids)
            metadatas = results["metadatas"][0] if results["metadatas"] else [{}] * len(ids)
            
            for i, opp_id in enumerate(ids):
                output.append((
                    opp_id,
                    1.0 - distances[i],  # Convert distance to similarity
                    metadatas[i] if metadatas else {},
                ))

        return output

    def delete_by_id(self, opportunity_id: str) -> None:
        """Delete an embedding by opportunity ID."""
        self._collection.delete(ids=[opportunity_id])

    def count(self) -> int:
        """Count total embeddings."""
        return self._collection.count()

    def clear(self) -> None:
        """Clear all embeddings (use with caution)."""
        self._client.delete_collection(self.COLLECTION_NAME)
        self._collection = self._client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )


# Singleton instance
_vector_db_instance: Optional[VectorDB] = None


def get_vector_db() -> VectorDB:
    """Get the VectorDB singleton."""
    global _vector_db_instance
    if _vector_db_instance is None:
        _vector_db_instance = VectorDB()
    return _vector_db_instance
