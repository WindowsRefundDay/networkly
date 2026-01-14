"""PostgreSQL sync for Networkly integration."""

import os
import sys
from typing import List, Optional
from datetime import datetime, timedelta

import asyncpg

from ..db.models import OpportunityCard, OpportunityTiming


class PostgresSync:
    """Sync opportunities to Networkly's PostgreSQL database."""
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize the PostgreSQL sync client.
        
        Args:
            database_url: PostgreSQL connection string. Defaults to DATABASE_URL env var.
        """
        self.database_url = database_url or os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        self._pool: Optional[asyncpg.Pool] = None
    
    async def connect(self) -> None:
        """Establish connection pool."""
        if self._pool is None:
            import ssl
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            self._pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=5,
                ssl=ssl_context,
                command_timeout=30,
            )
    
    async def close(self) -> None:
        """Close connection pool."""
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    async def upsert_opportunity(self, opportunity_card: OpportunityCard) -> str:
        """
        Insert or update an opportunity from an OpportunityCard.
        
        Args:
            opportunity_card: The extracted OpportunityCard to sync
            
        Returns:
            The opportunity ID
        """
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Check if URL already exists
            existing = await conn.fetchrow(
                'SELECT id FROM "Opportunity" WHERE url = $1',
                opportunity_card.url
            )
            
            if existing:
                # Update existing record
                await conn.execute('''
                    UPDATE "Opportunity" SET
                        title = $2,
                        company = $3,
                        location = $4,
                        type = $5,
                        category = $6,
                        deadline = $7,
                        skills = $8,
                        description = $9,
                        requirements = $10,
                        "sourceUrl" = $11,
                        "extractionConfidence" = $12,
                        "updatedAt" = $13,
                        "timingType" = $14,
                        "isExpired" = $15,
                        "nextCycleExpected" = $16,
                        "recheckAt" = $17,
                        "lastVerified" = $18
                    WHERE id = $1
                ''',
                    existing['id'],
                    opportunity_card.title,
                    opportunity_card.organization or 'Unknown',
                    opportunity_card.location or 'Remote',
                    opportunity_card.opportunity_type.value,
                    opportunity_card.category.value,
                    opportunity_card.deadline,
                    opportunity_card.tags,
                    opportunity_card.summary,
                    opportunity_card.requirements,
                    opportunity_card.source_url,
                    opportunity_card.extraction_confidence,
                    datetime.utcnow(),
                    opportunity_card.timing_type.value,
                    opportunity_card.is_expired,
                    opportunity_card.next_cycle_expected,
                    datetime.utcnow() + timedelta(days=opportunity_card.recheck_days),
                    datetime.utcnow(),
                )
                return existing['id']
            else:
                # Insert new record
                import uuid
                new_id = str(uuid.uuid4())
                
                # Calculate recheckAt based on AI-determined recheck_days
                recheck_days = getattr(opportunity_card, 'recheck_days', 14)
                recheck_at = datetime.utcnow() + timedelta(days=recheck_days)
                
                await conn.execute('''
                    INSERT INTO "Opportunity" (
                        id, url, title, company, location, type, category,
                        deadline, "postedDate", skills, description, requirements,
                        "sourceUrl", "extractionConfidence", "isActive", remote,
                        applicants, "recheckAt", "lastVerified", "createdAt", "updatedAt",
                        "timingType", "isExpired", "nextCycleExpected"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
                    )
                ''',
                    new_id,
                    opportunity_card.url,
                    opportunity_card.title,
                    opportunity_card.organization or 'Unknown',
                    opportunity_card.location or 'Remote',
                    opportunity_card.opportunity_type.value,
                    opportunity_card.category.value,
                    opportunity_card.deadline,
                    datetime.utcnow(),
                    opportunity_card.tags,
                    opportunity_card.summary,
                    opportunity_card.requirements,
                    opportunity_card.source_url,
                    opportunity_card.extraction_confidence,
                    True,  # isActive
                    opportunity_card.location_type.value == 'Online',  # remote
                    0,  # applicants
                    recheck_at,  # AI-determined recheck date
                    datetime.utcnow(),  # lastVerified
                    datetime.utcnow(),
                    datetime.utcnow(),
                    opportunity_card.timing_type.value,
                    opportunity_card.is_expired,
                    opportunity_card.next_cycle_expected,
                )
                return new_id
    
    async def sync_batch(self, opportunity_cards: List[OpportunityCard]) -> List[str]:
        """
        Sync multiple OpportunityCards to PostgreSQL.
        
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
        are marked with isExpired=true but kept active for recheck.
        
        Returns:
            Number of archived opportunities
        """
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Only archive expired one-time opportunities
            result = await conn.execute('''
                UPDATE "Opportunity"
                SET "isActive" = false, "updatedAt" = $1
                WHERE deadline < $1 
                  AND "isActive" = true
                  AND ("timingType" = 'one-time' OR "timingType" IS NULL)
            ''', datetime.utcnow())
            
            # Mark recurring/annual opportunities as expired but keep active for recheck
            await conn.execute('''
                UPDATE "Opportunity"
                SET "isExpired" = true, 
                    "updatedAt" = $1
                WHERE deadline < $1 
                  AND "isActive" = true
                  AND "timingType" IN ('annual', 'recurring', 'seasonal')
                  AND "isExpired" = false
            ''', datetime.utcnow())
            
            # Extract count from result
            count = int(result.split()[-1]) if result else 0
            return count


# Singleton
_sync_instance: Optional[PostgresSync] = None


def get_postgres_sync() -> PostgresSync:
    """Get the PostgreSQL sync singleton."""
    global _sync_instance
    if _sync_instance is None:
        _sync_instance = PostgresSync()
    return _sync_instance
