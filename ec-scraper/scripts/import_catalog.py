"""Import extracurriculars catalog into Supabase opportunities table.

Option A: Seed data — imports title, category, organization, and description
as searchable catalog entries. When users discover these via search, the
existing pipeline can crawl the real source for current deadlines/links.

Usage:
    python scripts/import_catalog.py [--dry-run] [--batch-size 50]
"""

import json
import os
import sys
import uuid
import re
from datetime import datetime
from pathlib import Path

# Add parent for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load env from project root
env_path = Path(__file__).parent.parent.parent / ".env.local"
if env_path.exists():
    load_dotenv(env_path)

from supabase import create_client

# ── Configuration ──────────────────────────────────────────────
CATALOG_PATH = Path(__file__).parent.parent / "data" / "extracurriculars_catalog.json"
BATCH_SIZE = 50

# Map scraped categories to the OpportunityCategory enum values used in the DB
CATEGORY_TO_DB = {
    "STEM": "STEM",
    "Research": "STEM",
    "Computer Science": "STEM",
    "Biology": "STEM",
    "Mathematics": "STEM",
    "Engineering": "STEM",
    "Environmental": "STEM",
    "Physics": "STEM",
    "Technology": "STEM",
    "Cybersecurity": "STEM",
    "Aerospace": "STEM",
    "Robotics": "STEM",
    "Science Communication": "STEM",
    "Interdisciplinary": "STEM",
    "Medicine": "STEM",
    "Innovation": "STEM",
    "Arts": "Arts",
    "Architecture": "Arts",
    "Writing": "Arts",
    "Business": "Business",
    "Leadership": "Leadership",
    "Community Service": "Community Service",
    "Humanities": "Humanities",
    "Competition": "Other",
    "Internship": "Other",
    "Academic": "Other",
    "Pre-College Program": "Other",
    "Program": "Other",
    "Law": "Other",
    "Journalism": "Other",
    "Other": "Other",
}

# Map scraped categories to OpportunityType enum
CATEGORY_TO_TYPE = {
    "Research": "Research",
    "Internship": "Internship",
    "Competition": "Competition",
    "Pre-College Program": "Summer Program",
    "Program": "Summer Program",
    "Academic": "Course",
    "Community Service": "Volunteer",
}

def parse_grade_levels(grade_str):
    """Parse grade level string into integer array."""
    if not grade_str:
        return []
    # Extract numbers from strings like "Grades 9-12", "Grade 11+", "9th-12th"
    numbers = re.findall(r'\d+', str(grade_str))
    if len(numbers) >= 2:
        try:
            lo, hi = int(numbers[0]), int(numbers[1])
            if 1 <= lo <= 12 and 1 <= hi <= 12:
                return list(range(lo, hi + 1))
        except ValueError:
            pass
    elif len(numbers) == 1:
        try:
            n = int(numbers[0])
            if 1 <= n <= 12:
                return [n]
        except ValueError:
            pass
    return []


def determine_location_type(item):
    """Determine In-Person / Online / Hybrid."""
    if item.get("is_remote"):
        return "Online"
    loc = (item.get("location") or "").lower()
    if "online" in loc or "virtual" in loc or "remote" in loc:
        return "Online"
    if "hybrid" in loc:
        return "Hybrid"
    if loc and loc not in ("", "various", "multiple", "nationwide", "international"):
        return "In-Person"
    return "In-Person"  # Default


def build_row(item):
    """Convert a catalog item to a Supabase opportunities row."""
    now = datetime.utcnow().isoformat()
    category = CATEGORY_TO_DB.get(item.get("category", "Other"), "Other")
    opp_type = CATEGORY_TO_TYPE.get(item.get("category", ""), "Other")
    location_type = determine_location_type(item)

    return {
        "id": str(uuid.uuid4()),
        "title": item["title"],
        "description": item.get("description", "") or "",
        "company": item.get("organization", "") or "Unknown",
        "url": item.get("url", "") or "",
        "source_url": item.get("url", "") or "",
        "category": category,
        "type": opp_type,
        "location": item.get("location", "") or "",
        "location_type": location_type,
        "remote": location_type == "Online",
        "grade_levels": parse_grade_levels(item.get("grade_level")),
        "skills": item.get("tags", []) or [],
        "is_active": True,
        "is_expired": False,
        "applicants": 0,
        "extraction_confidence": 0.6,  # Catalog data — moderate confidence
        "timing_type": "annual",  # Most extracurriculars are annual
        "posted_date": now,
        "created_at": now,
        "updated_at": now,
        "last_verified": now,
    }


def main():
    dry_run = "--dry-run" in sys.argv
    batch_size = BATCH_SIZE
    for i, arg in enumerate(sys.argv):
        if arg == "--batch-size" and i + 1 < len(sys.argv):
            batch_size = int(sys.argv[i + 1])

    # Load catalog
    if not CATALOG_PATH.exists():
        print(f"ERROR: Catalog not found at {CATALOG_PATH}")
        print("Run the scraping scripts first to generate the catalog.")
        sys.exit(1)

    with open(CATALOG_PATH) as f:
        catalog = json.load(f)
    print(f"Loaded {len(catalog)} activities from catalog")

    # Connect to Supabase
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print("ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY not set")
        sys.exit(1)

    client = create_client(supabase_url, supabase_key)
    print(f"Connected to Supabase: {supabase_url[:40]}...")

    # Check existing titles to avoid duplicates
    print("Fetching existing opportunity titles...")
    existing_titles = set()
    offset = 0
    page_size = 1000
    while True:
        result = client.table("opportunities").select("title").range(offset, offset + page_size - 1).execute()
        if not result.data:
            break
        for row in result.data:
            if row.get("title"):
                existing_titles.add(row["title"].strip().lower())
        if len(result.data) < page_size:
            break
        offset += page_size

    print(f"Found {len(existing_titles)} existing opportunities in database")

    # Filter out duplicates
    new_items = []
    skipped = 0
    for item in catalog:
        title_key = item["title"].strip().lower()
        if title_key in existing_titles:
            skipped += 1
            continue
        new_items.append(item)
        existing_titles.add(title_key)  # Prevent intra-catalog dupes

    print(f"New to import: {len(new_items)} | Already exist: {skipped}")

    if not new_items:
        print("Nothing to import — all activities already in database.")
        return

    if dry_run:
        print(f"\n[DRY RUN] Would import {len(new_items)} activities. Samples:")
        for item in new_items[:5]:
            row = build_row(item)
            print(f"  {row['title']} | {row['category']} | {row['type']} | {row['company']}")
        print(f"\nRun without --dry-run to import.")
        return

    # Batch insert
    imported = 0
    errors = 0
    for i in range(0, len(new_items), batch_size):
        batch = new_items[i:i + batch_size]
        rows = [build_row(item) for item in batch]

        try:
            client.table("opportunities").insert(rows).execute()
            imported += len(rows)
            print(f"  Imported batch {i // batch_size + 1}: {len(rows)} rows (total: {imported})")
        except Exception as e:
            # Try one-by-one on batch failure
            print(f"  Batch {i // batch_size + 1} failed: {e}")
            print(f"  Retrying individually...")
            for row in rows:
                try:
                    client.table("opportunities").insert(row).execute()
                    imported += 1
                except Exception as e2:
                    errors += 1
                    print(f"    SKIP: {row['title'][:50]} — {str(e2)[:80]}")

    print(f"\n{'='*60}")
    print(f"IMPORT COMPLETE")
    print(f"  Imported: {imported}")
    print(f"  Skipped (duplicates): {skipped}")
    print(f"  Errors: {errors}")
    print(f"  Total in database: {len(existing_titles)}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
