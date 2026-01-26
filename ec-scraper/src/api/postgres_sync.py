"""Supabase sync for Networkly integration.

Replaces asyncpg with Supabase client to write directly to Supabase opportunities table.
"""

import os
import sys
import asyncio
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import re
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from supabase import create_client, Client
from postgrest.exceptions import APIError

from ..db.models import OpportunityCard, OpportunityTiming
from ..config import get_settings


class PostgresSync:
    """Sync opportunities to Networkly's Supabase database."""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize the Supabase sync client.
        
        Args:
            database_url: Legacy DATABASE_URL (deprecated, use SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
        """
        settings = get_settings()
        
        # Prefer Supabase env vars, fallback to DATABASE_URL for backward compatibility
        self.supabase_url = settings.SUPABASE_URL or os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
        self.supabase_key = settings.SUPABASE_SERVICE_ROLE_KEY or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_SECRET_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required. "
                "Alternatively, set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
            )
        
        self._client: Optional[Client] = None
    
    def _get_client(self) -> Client:
        """Get or create Supabase client."""
        if self._client is None:
            self._client = create_client(self.supabase_url, self.supabase_key)
        return self._client

    def _normalize_url(self, url: str) -> str:
        """Normalize URLs for deduplication."""
        try:
            parsed = urlparse(url)
            scheme = parsed.scheme or "https"
            netloc = parsed.netloc.lower()
            if netloc.startswith("www."):
                netloc = netloc[4:]
            path = parsed.path.rstrip("/")
            tracking_params = {
                "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
                "gclid", "fbclid", "mc_cid", "mc_eid",
            }
            query_params = [
                (key, value)
                for key, value in parse_qsl(parsed.query, keep_blank_values=False)
                if key.lower() not in tracking_params
            ]
            query = urlencode(query_params, doseq=True)
            return urlunparse((scheme, netloc, path, "", query, ""))
        except Exception:
            return url

    def _normalize_text(self, value: str) -> str:
        cleaned = re.sub(r"[^a-z0-9\s]", " ", (value or "").lower())
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned
    
    async def connect(self) -> None:
        """Establish connection (no-op for Supabase, kept for API compatibility)."""
        self._get_client()
    
    async def close(self) -> None:
        """Close connection (no-op for Supabase, kept for API compatibility)."""
        self._client = None
    
    async def upsert_opportunity(self, opportunity_card: OpportunityCard) -> str:
        """
        Insert or update an opportunity from an OpportunityCard.
        
        Maps OpportunityCard fields to Supabase opportunities table with snake_case columns.
        
        Args:
            opportunity_card: The extracted OpportunityCard to sync
            
        Returns:
            The opportunity ID
        """
        client = self._get_client()
        
        # Map OpportunityCard to Supabase schema (snake_case)
        now = datetime.utcnow()
        recheck_days = getattr(opportunity_card, 'recheck_days', 14)
        recheck_at = now + timedelta(days=recheck_days)
        
        canonical_url = self._normalize_url(opportunity_card.url)
        clean_title = " ".join((opportunity_card.title or "").split())
        clean_org = " ".join((opportunity_card.organization or "Unknown").split())

        opportunity_data = {
            "url": canonical_url,
            "title": opportunity_card.title,
            "company": opportunity_card.organization or 'Unknown',
            "location": opportunity_card.location or 'Remote',
            "type": opportunity_card.opportunity_type.value,
            "category": opportunity_card.category.value,
            "deadline": opportunity_card.deadline.isoformat() if opportunity_card.deadline else None,
            "posted_date": now.isoformat(),
            "skills": opportunity_card.tags or [],
            "description": opportunity_card.summary or '',
            "requirements": opportunity_card.requirements,
            "source_url": opportunity_card.source_url or opportunity_card.url,
            "extraction_confidence": opportunity_card.extraction_confidence,
            "is_active": True,
            "remote": opportunity_card.location_type.value == 'Online',
            "applicants": 0,
            "recheck_at": recheck_at.isoformat(),
            "last_verified": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
            "timing_type": opportunity_card.timing_type.value,
            "is_expired": opportunity_card.is_expired,
            "next_cycle_expected": opportunity_card.next_cycle_expected.isoformat() if opportunity_card.next_cycle_expected else None,
        }
        
        try:
            # Run Supabase calls synchronously (client is sync by default)
            # Check if URL already exists
            existing = client.table("opportunities").select("id").eq("url", canonical_url).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                opp_id = existing.data[0]["id"]
                update_data = {**opportunity_data, "updated_at": now.isoformat()}
                # Remove id and created_at from update
                update_data.pop("created_at", None)
                
                client.table("opportunities").update(update_data).eq("id", opp_id).execute()
                return opp_id
            else:
                # Title + organization dedupe (case-insensitive exact match)
                if clean_title and clean_org:
                    alt_existing = (
                        client.table("opportunities")
                        .select("id")
                        .ilike("title", clean_title)
                        .ilike("company", clean_org)
                        .limit(1)
                        .execute()
                    )
                    if alt_existing.data and len(alt_existing.data) > 0:
                        opp_id = alt_existing.data[0]["id"]
                        update_data = {**opportunity_data, "updated_at": now.isoformat()}
                        update_data.pop("created_at", None)
                        client.table("opportunities").update(update_data).eq("id", opp_id).execute()
                        return opp_id
                # Insert new record
                new_id = str(uuid.uuid4())
                insert_data = {**opportunity_data, "id": new_id}
                
                client.table("opportunities").insert(insert_data).execute()
                return new_id
                
        except APIError as e:
            error_msg = f"Supabase API error: {e.message}"
            if e.details:
                error_msg += f" Details: {e.details}"
            sys.stderr.write(f"✗ Failed to sync {opportunity_card.title}: {error_msg}\n")
            raise Exception(error_msg) from e
        except Exception as e:
            sys.stderr.write(f"✗ Failed to sync {opportunity_card.title}: {str(e)}\n")
            raise
    
    async def sync_batch(self, opportunity_cards: List[OpportunityCard]) -> List[str]:
        """
        Sync multiple OpportunityCards to Supabase.
        
        Args:
            opportunity_cards: List of OpportunityCards to sync
            
        Returns:
            List of synced opportunity IDs
        """
        ids = []
        for card in opportunity_cards:
            try:
                opp_id = await self.upsert_opportunity(card)
                ids.append(opp_id)
                sys.stderr.write(f"✓ Synced: {card.title}\n")
            except Exception as e:
                sys.stderr.write(f"✗ Failed to sync {card.title}: {e}\n")
        return ids
    
    async def archive_expired(self) -> int:
        """
        Archive opportunities past their deadline.
        
        Only archives one-time opportunities. Annual/recurring/seasonal opportunities
        are marked with is_expired=true but kept active for recheck.
        
        Returns:
            Number of archived opportunities
        """
        client = self._get_client()
        now = datetime.utcnow()
        
        try:
            # Archive expired one-time opportunities
            archived = client.table("opportunities").update({
                "is_active": False,
                "updated_at": now.isoformat()
            }).eq("is_active", True).lt("deadline", now.isoformat()).in_("timing_type", ["one-time", None]).execute()
            
            # Mark recurring/annual opportunities as expired but keep active
            client.table("opportunities").update({
                "is_expired": True,
                "updated_at": now.isoformat()
            }).eq("is_active", True).eq("is_expired", False).lt("deadline", now.isoformat()).in_("timing_type", ["annual", "recurring", "seasonal"]).execute()
            
            # Count archived (approximate - Supabase doesn't return exact count)
            return len(archived.data) if archived.data else 0
            
        except Exception as e:
            sys.stderr.write(f"✗ Failed to archive expired: {e}\n")
            return 0


# Singleton
_sync_instance: Optional[PostgresSync] = None


def get_postgres_sync() -> PostgresSync:
    """Get the Supabase sync singleton."""
    global _sync_instance
    if _sync_instance is None:
        _sync_instance = PostgresSync()
    return _sync_instance
