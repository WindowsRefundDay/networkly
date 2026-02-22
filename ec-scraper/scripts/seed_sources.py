"""Seed initial URLs into the database."""

import json
from pathlib import Path

from src.db.models import PendingURL
from src.db.sqlite_db import get_sqlite_db


def seed_urls():
    """Load seed URLs from JSON and add to pending queue."""
    db = get_sqlite_db()
    seed_file = Path(__file__).parent.parent / "data" / "seed_urls.json"
    
    if not seed_file.exists():
        print(f"Seed file not found: {seed_file}")
        return
    
    with open(seed_file, "r") as f:
        data = json.load(f)
    
    seed_urls = data.get("seed_urls", [])
    added = 0
    
    for item in seed_urls:
        pending = PendingURL(
            url=item["url"],
            source=item.get("source", "curated"),
            priority=item.get("priority", 5),
        )
        if db.add_pending_url(pending):
            added += 1
            print(f"  Added: {item['url']}")
        else:
            print(f"  Skipped (exists): {item['url']}")
    
    print(f"\nSeeded {added} new URLs out of {len(seed_urls)} total")


if __name__ == "__main__":
    seed_urls()
