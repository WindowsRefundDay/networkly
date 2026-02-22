"""Bootstrap the database using curated sources only."""

import argparse
import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load env first
load_dotenv()

# Add parent directory to path for src imports
sys.path.insert(0, str(Path(__file__).parent.parent))
# Add scripts directory to path for local imports
sys.path.insert(0, str(Path(__file__).parent))

from src.api.postgres_sync import PostgresSync
from src.sources.curated_sources import get_all_curated_urls, get_curated_urls_by_category, get_categories
import batch_discovery
from batch_discovery import BatchDiscovery


async def run_bootstrap(category: str | None, limit: int, quiet: bool, profile: str) -> None:
    """Run a curated-only bootstrap discovery."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        db_url = db_url.strip().strip('"').strip("'")

    if not db_url:
        print("Error: DATABASE_URL not found in environment", file=sys.stderr)
        sys.exit(1)

    discovery = BatchDiscovery(db_url, verbose=not quiet, profile=profile)
    sync = PostgresSync(db_url)
    await sync.connect()

    try:
        if category:
            if category not in get_categories():
                print(f"Error: Unknown category '{category}'. Options: {', '.join(get_categories())}")
                sys.exit(1)
            curated_urls = get_curated_urls_by_category(category)
        else:
            curated_urls = get_all_curated_urls()

        unseen = discovery.url_cache.filter_unseen(curated_urls, within_days=14)
        if not quiet:
            print(f"[Bootstrap] Curated URLs: {len(curated_urls)}, new/due: {len(unseen)}", flush=True)

        urls_to_process = set(unseen[:limit])
        if not urls_to_process:
            print("[Bootstrap] No new curated URLs to process.")
            return

        await discovery.process_urls(urls_to_process, sync)
    finally:
        await sync.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Bootstrap DB using curated sources only")
    parser.add_argument(
        "--category",
        help="Optional curated category (e.g., competitions, internships, scholarships)",
        default=None,
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Max curated URLs to process (default: 100)",
    )
    parser.add_argument(
        "--profile",
        choices=["quick", "daily"],
        default="daily",
        help="Discovery profile: quick or daily (default: daily)",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress messages",
    )

    args = parser.parse_args()
    asyncio.run(run_bootstrap(args.category, args.limit, args.quiet, args.profile))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️  Bootstrap interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}", file=sys.stderr)
        sys.exit(1)
