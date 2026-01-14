"""SQLite database operations for structured opportunity data storage."""

import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Generator, List, Optional

from ..config import get_settings
from .models import OpportunityCard, PendingURL


class SQLiteDB:
    """SQLite database manager for opportunity data."""

    def __init__(self, db_path: Optional[Path] = None):
        """Initialize SQLite database."""
        self.db_path = db_path or get_settings().sqlite_path
        self._init_db()

    def _init_db(self) -> None:
        """Initialize database schema."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # EC Opportunities table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS opportunities (
                    id TEXT PRIMARY KEY,
                    url TEXT UNIQUE NOT NULL,
                    source_url TEXT,
                    title TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    organization TEXT,
                    category TEXT NOT NULL,
                    suggested_category TEXT,
                    ec_type TEXT NOT NULL,
                    tags TEXT,
                    grade_levels TEXT,
                    location_type TEXT NOT NULL,
                    location TEXT,
                    deadline TEXT,
                    start_date TEXT,
                    end_date TEXT,
                    cost TEXT,
                    time_commitment TEXT,
                    requirements TEXT,
                    prizes TEXT,
                    contact_email TEXT,
                    application_url TEXT,
                    date_discovered TEXT NOT NULL,
                    date_updated TEXT NOT NULL,
                    extraction_confidence REAL DEFAULT 0.0
                )
            """)
            
            # Add suggested_category column if it doesn't exist (migration)
            try:
                cursor.execute("ALTER TABLE opportunities ADD COLUMN suggested_category TEXT")
            except sqlite3.OperationalError:
                pass  # Column already exists

            # Create FTS5 virtual table for full-text search
            cursor.execute("""
                CREATE VIRTUAL TABLE IF NOT EXISTS opportunities_fts USING fts5(
                    id,
                    title,
                    summary,
                    organization,
                    tags,
                    requirements,
                    content='opportunities',
                    content_rowid='rowid'
                )
            """)

            # Triggers to keep FTS in sync
            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS opportunities_ai AFTER INSERT ON opportunities BEGIN
                    INSERT INTO opportunities_fts(rowid, id, title, summary, organization, tags, requirements)
                    VALUES (new.rowid, new.id, new.title, new.summary, new.organization, new.tags, new.requirements);
                END
            """)

            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS opportunities_ad AFTER DELETE ON opportunities BEGIN
                    INSERT INTO opportunities_fts(opportunities_fts, rowid, id, title, summary, organization, tags, requirements)
                    VALUES('delete', old.rowid, old.id, old.title, old.summary, old.organization, old.tags, old.requirements);
                END
            """)

            cursor.execute("""
                CREATE TRIGGER IF NOT EXISTS opportunities_au AFTER UPDATE ON opportunities BEGIN
                    INSERT INTO opportunities_fts(opportunities_fts, rowid, id, title, summary, organization, tags, requirements)
                    VALUES('delete', old.rowid, old.id, old.title, old.summary, old.organization, old.tags, old.requirements);
                    INSERT INTO opportunities_fts(rowid, id, title, summary, organization, tags, requirements)
                    VALUES (new.rowid, new.id, new.title, new.summary, new.organization, new.tags, new.requirements);
                END
            """)

            # Pending URLs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS pending_urls (
                    id TEXT PRIMARY KEY,
                    url TEXT UNIQUE NOT NULL,
                    source TEXT NOT NULL,
                    discovered_at TEXT NOT NULL,
                    priority INTEGER DEFAULT 0,
                    attempts INTEGER DEFAULT 0,
                    last_attempt TEXT,
                    status TEXT DEFAULT 'pending'
                )
            """)

            conn.commit()

    @contextmanager
    def _get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Get a database connection."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def upsert_opportunity(self, opportunity: OpportunityCard) -> bool:
        """Insert or update an opportunity."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO opportunities (
                    id, url, source_url, title, summary, organization,
                    category, suggested_category, opportunity_type, tags, grade_levels, location_type,
                    location, deadline, start_date, end_date, cost,
                    time_commitment, requirements, prizes, contact_email,
                    application_url, date_discovered, date_updated, extraction_confidence
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(url) DO UPDATE SET
                    title = excluded.title,
                    summary = excluded.summary,
                    organization = excluded.organization,
                    category = excluded.category,
                    suggested_category = excluded.suggested_category,
                    opportunity_type = excluded.opportunity_type,
                    tags = excluded.tags,
                    grade_levels = excluded.grade_levels,
                    location_type = excluded.location_type,
                    location = excluded.location,
                    deadline = excluded.deadline,
                    start_date = excluded.start_date,
                    end_date = excluded.end_date,
                    cost = excluded.cost,
                    time_commitment = excluded.time_commitment,
                    requirements = excluded.requirements,
                    prizes = excluded.prizes,
                    contact_email = excluded.contact_email,
                    application_url = excluded.application_url,
                    date_updated = excluded.date_updated,
                    extraction_confidence = excluded.extraction_confidence
            """, (
                opportunity.id,
                opportunity.url,
                opportunity.source_url,
                opportunity.title,
                opportunity.summary,
                opportunity.organization,
                opportunity.category.value,
                opportunity.suggested_category,
                opportunity.opportunity_type.value,
                json.dumps(opportunity.tags),
                json.dumps(opportunity.grade_levels),
                opportunity.location_type.value,
                opportunity.location,
                opportunity.deadline.isoformat() if opportunity.deadline else None,
                opportunity.start_date.isoformat() if opportunity.start_date else None,
                opportunity.end_date.isoformat() if opportunity.end_date else None,
                opportunity.cost,
                opportunity.time_commitment,
                opportunity.requirements,
                opportunity.prizes,
                opportunity.contact_email,
                opportunity.application_url,
                opportunity.date_discovered.isoformat(),
                opportunity.date_updated.isoformat(),
                opportunity.extraction_confidence,
            ))
            conn.commit()
            return cursor.rowcount > 0

    def get_opportunity(self, url: str) -> Optional[OpportunityCard]:
        """Get an opportunity by URL."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM opportunities WHERE url = ?", (url,))
            row = cursor.fetchone()
            if row:
                return self._row_to_opportunity_card(row)
            return None

    def get_all_opportunities(self, limit: int = 100, offset: int = 0) -> List[OpportunityCard]:
        """Get all opportunities with pagination."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM opportunities ORDER BY date_updated DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
            return [self._row_to_opportunity_card(row) for row in cursor.fetchall()]

    def search_by_text(self, query: str, limit: int = 20) -> List[OpportunityCard]:
        """Full-text search for opportunities."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT o.* FROM opportunities o
                JOIN opportunities_fts fts ON o.id = fts.id
                WHERE opportunities_fts MATCH ?
                ORDER BY rank
                LIMIT ?
            """, (query, limit))
            return [self._row_to_opportunity_card(row) for row in cursor.fetchall()]

    def count_opportunities(self) -> int:
        """Count total opportunities."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM opportunities")
            return cursor.fetchone()[0]

    def _row_to_opportunity_card(self, row: sqlite3.Row) -> OpportunityCard:
        """Convert a database row to an OpportunityCard."""
        from .models import OpportunityCategory, OpportunityType, LocationType

        # Handle suggested_category which may not exist in older databases
        suggested_category = None
        try:
            suggested_category = row["suggested_category"]
        except (IndexError, KeyError):
            pass

        # Handle ec_type or opportunity_type column (migration support)
        opp_type_value = row.get("opportunity_type") or row.get("ec_type") or "Other"
        
        return OpportunityCard(
            id=row["id"],
            url=row["url"],
            source_url=row["source_url"],
            title=row["title"],
            summary=row["summary"],
            organization=row["organization"],
            category=OpportunityCategory(row["category"]),
            suggested_category=suggested_category,
            opportunity_type=OpportunityType(opp_type_value),
            tags=json.loads(row["tags"]) if row["tags"] else [],
            grade_levels=json.loads(row["grade_levels"]) if row["grade_levels"] else [],
            location_type=LocationType(row["location_type"]),
            location=row["location"],
            deadline=datetime.fromisoformat(row["deadline"]) if row["deadline"] else None,
            start_date=datetime.fromisoformat(row["start_date"]) if row["start_date"] else None,
            end_date=datetime.fromisoformat(row["end_date"]) if row["end_date"] else None,
            cost=row["cost"],
            time_commitment=row["time_commitment"],
            requirements=row["requirements"],
            prizes=row["prizes"],
            contact_email=row["contact_email"],
            application_url=row["application_url"],
            date_discovered=datetime.fromisoformat(row["date_discovered"]),
            date_updated=datetime.fromisoformat(row["date_updated"]),
            extraction_confidence=row["extraction_confidence"],
        )

    # Pending URLs operations
    def add_pending_url(self, pending: PendingURL) -> bool:
        """Add a URL to the pending queue."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO pending_urls (id, url, source, discovered_at, priority, attempts, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(url) DO NOTHING
                """, (
                    pending.id,
                    pending.url,
                    pending.source,
                    pending.discovered_at.isoformat(),
                    pending.priority,
                    pending.attempts,
                    pending.status,
                ))
                conn.commit()
                return cursor.rowcount > 0
            except sqlite3.IntegrityError:
                return False

    def get_pending_urls(self, limit: int = 10) -> List[PendingURL]:
        """Get pending URLs ordered by priority."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM pending_urls
                WHERE status = 'pending'
                ORDER BY priority DESC, discovered_at ASC
                LIMIT ?
            """, (limit,))
            return [self._row_to_pending_url(row) for row in cursor.fetchall()]

    def update_pending_status(self, url: str, status: str) -> None:
        """Update the status of a pending URL."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE pending_urls
                SET status = ?, last_attempt = ?, attempts = attempts + 1
                WHERE url = ?
            """, (status, datetime.utcnow().isoformat(), url))
            conn.commit()

    def _row_to_pending_url(self, row: sqlite3.Row) -> PendingURL:
        """Convert a database row to a PendingURL."""
        return PendingURL(
            id=row["id"],
            url=row["url"],
            source=row["source"],
            discovered_at=datetime.fromisoformat(row["discovered_at"]),
            priority=row["priority"],
            attempts=row["attempts"],
            last_attempt=datetime.fromisoformat(row["last_attempt"]) if row["last_attempt"] else None,
            status=row["status"],
        )


# Singleton instance
_db_instance: Optional[SQLiteDB] = None


def get_sqlite_db() -> SQLiteDB:
    """Get the SQLite database singleton."""
    global _db_instance
    if _db_instance is None:
        _db_instance = SQLiteDB()
    return _db_instance
