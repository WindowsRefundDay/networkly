"""PostgreSQL sync for Networkly integration."""

import os
from typing import List, Optional
from datetime import datetime

import asyncpg

from ..db.models import ECCard


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
    
    async def upsert_opportunity(self, ec_card: ECCard) -> str:
        """
        Insert or update an opportunity from an ECCard.
        
        Args:
            ec_card: The extracted ECCard to sync
            
        Returns:
            The opportunity ID
        """
        await self.connect()
        
        async with self._pool.acquire() as conn:
            # Check if URL already exists
            existing = await conn.fetchrow(
                'SELECT id FROM "Opportunity" WHERE url = $1',
                ec_card.url
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
                        "updatedAt" = $13
                    WHERE id = $1
                ''',
                    existing['id'],
                    ec_card.title,
                    ec_card.organization or 'Unknown',
                    ec_card.location or 'Remote',
                    ec_card.ec_type.value,
                    ec_card.category.value,
                    ec_card.deadline,
                    ec_card.tags,
                    ec_card.summary,
                    ec_card.requirements,
                    ec_card.source_url,
                    ec_card.extraction_confidence,
                    datetime.utcnow(),
                )
                return existing['id']
            else:
                # Insert new record
                import uuid
                from datetime import timedelta
                new_id = str(uuid.uuid4())
                
                # Calculate recheckAt based on AI-determined recheck_days
                recheck_days = getattr(ec_card, 'recheck_days', 14)
                recheck_at = datetime.utcnow() + timedelta(days=recheck_days)
                
                await conn.execute('''
                    INSERT INTO "Opportunity" (
                        id, url, title, company, location, type, category,
                        deadline, "postedDate", skills, description, requirements,
                        "sourceUrl", "extractionConfidence", "isActive", remote,
                        applicants, "recheckAt", "lastVerified", "createdAt", "updatedAt"
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                    )
                ''',
                    new_id,
                    ec_card.url,
                    ec_card.title,
                    ec_card.organization or 'Unknown',
                    ec_card.location or 'Remote',
                    ec_card.ec_type.value,
                    ec_card.category.value,
                    ec_card.deadline,
                    datetime.utcnow(),
                    ec_card.tags,
                    ec_card.summary,
                    ec_card.requirements,
                    ec_card.source_url,
                    ec_card.extraction_confidence,
                    True,  # isActive
                    ec_card.location_type.value == 'Online',  # remote
                    0,  # applicants
                    recheck_at,  # AI-determined recheck date
                    datetime.utcnow(),  # lastVerified
                    datetime.utcnow(),
                    datetime.utcnow(),
                )
                return new_id
    
    async def sync_batch(self, ec_cards: List[ECCard]) -> List[str]:
        """
        Sync multiple ECCards to PostgreSQL.
        
        Args:
            ec_cards: List of ECCards to sync
            
        Returns:
            List of synced opportunity IDs
        """
        ids = []
        for card in ec_cards:
            try:
                opp_id = await self.upsert_opportunity(card)
                ids.append(opp_id)
                print(f"✓ Synced: {card.title}")
            except Exception as e:
                print(f"✗ Failed to sync {card.title}: {e}")
        return ids
    
    async def archive_expired(self) -> int:
        """
        Archive opportunities past their deadline.
        
        Returns:
            Number of archived opportunities
        """
        await self.connect()
        
        async with self._pool.acquire() as conn:
            result = await conn.execute('''
                UPDATE "Opportunity"
                SET "isActive" = false, "updatedAt" = $1
                WHERE deadline < $1 AND "isActive" = true
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
