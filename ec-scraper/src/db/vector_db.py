"""Supabase pgvector database for semantic search.

Migrated from ChromaDB to Supabase opportunity_embeddings table with pgvector.
"""

import asyncio
from pathlib import Path
from typing import List, Optional, Tuple

from supabase import create_client, Client

from ..config import get_settings
from .models import OpportunityCard


class VectorDB:
    """Supabase pgvector manager for vector similarity search."""

    def __init__(self, db_path: Optional[Path] = None):
        """
        Initialize Supabase vector DB.
        
        Args:
            db_path: Deprecated (kept for API compatibility). Uses Supabase instead.
        """
        settings = get_settings()
        
        # Get Supabase credentials
        import os
        self.supabase_url = settings.SUPABASE_URL or os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for vector DB. "
                "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
            )
        
        self._client: Optional[Client] = None

    def _get_client(self) -> Client:
        """Get or create Supabase client."""
        if self._client is None:
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client

    def add_embedding(
        self,
        opportunity_id: str,
        embedding: List[float],
        metadata: Optional[dict] = None,
    ) -> None:
        """Add or update an embedding for an opportunity."""
        client = self._get_client()
        
        def _add():
            # Upsert embedding into opportunity_embeddings table
            data = {
                "opportunity_id": opportunity_id,
                "embedding": embedding,  # pgvector column
            }
            
            # Add metadata fields if provided
            if metadata:
                if "title" in metadata:
                    data["title"] = metadata["title"]
                if "category" in metadata:
                    data["category"] = metadata["category"]
                if "opportunity_type" in metadata:
                    data["opportunity_type"] = metadata["opportunity_type"]
                if "url" in metadata:
                    data["url"] = metadata["url"]
            
            client.table("opportunity_embeddings").upsert(data, on_conflict="opportunity_id").execute()
        
        asyncio.run(asyncio.to_thread(_add))

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
        Search for similar opportunities by embedding using pgvector.
        
        Returns list of (id, similarity_score, metadata) tuples.
        """
        client = self._get_client()
        
        def _search():
            # Use Supabase RPC for pgvector similarity search
            # Assuming a function like: match_opportunities(embedding vector, match_threshold float, match_count int, category text)
            # If RPC doesn't exist, we'll use a workaround with PostgREST
            
            # For now, use a workaround: fetch all and compute similarity client-side
            # (Not ideal for large datasets, but works until RPC function is created)
            # Better: Create RPC function in Supabase:
            # CREATE OR REPLACE FUNCTION match_opportunities(
            #   query_embedding vector(256),
            #   match_threshold float DEFAULT 0.5,
            #   match_count int DEFAULT 10,
            #   filter_category text DEFAULT NULL
            # )
            # RETURNS TABLE (
            #   opportunity_id text,
            #   similarity float,
            #   title text,
            #   category text,
            #   opportunity_type text,
            #   url text
            # )
            # LANGUAGE plpgsql
            # AS $$
            # BEGIN
            #   RETURN QUERY
            #   SELECT
            #     oe.opportunity_id,
            #     1 - (oe.embedding <=> query_embedding) as similarity,
            #     oe.title,
            #     oe.category,
            #     oe.opportunity_type,
            #     oe.url
            #   FROM opportunity_embeddings oe
            #   WHERE (filter_category IS NULL OR oe.category = filter_category)
            #   ORDER BY oe.embedding <=> query_embedding
            #   LIMIT match_count;
            # END;
            # $$;
            
            try:
                # Try RPC function first (if it exists)
                result = client.rpc(
                    "match_opportunities",
                    {
                        "query_embedding": query_embedding,
                        "match_threshold": 0.5,
                        "match_count": limit,
                        "filter_category": category_filter,
                    }
                ).execute()
                
                if result.data:
                    return [
                        (
                            row["opportunity_id"],
                            row["similarity"],
                            {
                                "title": row.get("title"),
                                "category": row.get("category"),
                                "opportunity_type": row.get("opportunity_type"),
                                "url": row.get("url"),
                            }
                        )
                        for row in result.data
                    ]
            except Exception:
                # Fallback: fetch limited set and compute similarity client-side
                # This is inefficient but works without RPC function
                query = client.table("opportunity_embeddings").select("opportunity_id, embedding, title, category, opportunity_type, url").limit(1000)
                if category_filter:
                    query = query.eq("category", category_filter)
                
                result = query.execute()
                
                if not result.data:
                    return []
                
                # Compute cosine similarity client-side
                import numpy as np
                query_vec = np.array(query_embedding)
                similarities = []
                
                for row in result.data:
                    if row.get("embedding"):
                        vec = np.array(row["embedding"])
                        # Cosine similarity
                        similarity = np.dot(query_vec, vec) / (np.linalg.norm(query_vec) * np.linalg.norm(vec))
                        similarities.append((
                            row["opportunity_id"],
                            float(similarity),
                            {
                                "title": row.get("title"),
                                "category": row.get("category"),
                                "opportunity_type": row.get("opportunity_type"),
                                "url": row.get("url"),
                            }
                        ))
                
                # Sort by similarity and return top N
                similarities.sort(key=lambda x: x[1], reverse=True)
                return similarities[:limit]
            
            return []
        
        return asyncio.run(asyncio.to_thread(_search))

    def delete_by_id(self, opportunity_id: str) -> None:
        """Delete an embedding by opportunity ID."""
        client = self._get_client()
        
        def _delete():
            client.table("opportunity_embeddings").delete().eq("opportunity_id", opportunity_id).execute()
        
        asyncio.run(asyncio.to_thread(_delete))

    def count(self) -> int:
        """Count total embeddings."""
        client = self._get_client()
        
        def _count():
            result = client.table("opportunity_embeddings").select("opportunity_id", count="exact").execute()
            return result.count if hasattr(result, 'count') else len(result.data) if result.data else 0
        
        return asyncio.run(asyncio.to_thread(_count))

    def clear(self) -> None:
        """Clear all embeddings (use with caution)."""
        client = self._get_client()
        
        def _clear():
            # Delete all rows
            client.table("opportunity_embeddings").delete().neq("opportunity_id", "").execute()
        
        asyncio.run(asyncio.to_thread(_clear))


# Singleton instance
_vector_db_instance: Optional[VectorDB] = None


def get_vector_db() -> VectorDB:
    """Get the VectorDB singleton."""
    global _vector_db_instance
    if _vector_db_instance is None:
        _vector_db_instance = VectorDB()
    return _vector_db_instance
