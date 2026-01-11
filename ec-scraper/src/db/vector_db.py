"""ChromaDB vector database for semantic search."""

from pathlib import Path
from typing import List, Optional, Tuple

import chromadb
from chromadb.config import Settings as ChromaSettings

from ..config import get_settings
from .models import ECCard


class VectorDB:
    """ChromaDB manager for vector similarity search."""

    COLLECTION_NAME = "ec_opportunities"

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
        ec_id: str,
        embedding: List[float],
        metadata: Optional[dict] = None,
    ) -> None:
        """Add or update an embedding for an EC."""
        self._collection.upsert(
            ids=[ec_id],
            embeddings=[embedding],
            metadatas=[metadata] if metadata else None,
        )

    def add_ec_with_embedding(
        self,
        ec: ECCard,
        embedding: List[float],
    ) -> None:
        """Add an EC card with its embedding."""
        metadata = {
            "title": ec.title,
            "category": ec.category.value,
            "ec_type": ec.ec_type.value,
            "url": ec.url,
        }
        self.add_embedding(ec.id, embedding, metadata)

    def search_similar(
        self,
        query_embedding: List[float],
        limit: int = 10,
        category_filter: Optional[str] = None,
    ) -> List[Tuple[str, float, dict]]:
        """
        Search for similar ECs by embedding.
        
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
            
            for i, ec_id in enumerate(ids):
                output.append((
                    ec_id,
                    1.0 - distances[i],  # Convert distance to similarity
                    metadatas[i] if metadatas else {},
                ))

        return output

    def delete_by_id(self, ec_id: str) -> None:
        """Delete an embedding by EC ID."""
        self._collection.delete(ids=[ec_id])

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
