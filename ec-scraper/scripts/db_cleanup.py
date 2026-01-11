"""Database cleanup utilities for the EC scraper."""

import asyncio
import os
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import typer
from rich import print as rprint
from rich.console import Console
from rich.table import Table

console = Console()
app = typer.Typer(help="Database cleanup utilities")


def check_database_url():
    """Ensure DATABASE_URL is configured."""
    if not os.getenv('DATABASE_URL'):
        rprint("[red]✗ DATABASE_URL environment variable not set[/red]")
        raise typer.Exit(1)


@app.command()
def list_postgres():
    """List all opportunities in PostgreSQL."""
    check_database_url()
    asyncio.run(_list_postgres())


async def _list_postgres():
    """List opportunities from PostgreSQL."""
    from src.api.postgres_sync import get_postgres_sync
    
    sync = get_postgres_sync()
    try:
        await sync.connect()
        async with sync._pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT id, title, company, category, "extractionConfidence", "isActive"
                FROM "Opportunity"
                ORDER BY "createdAt" DESC
            ''')
        
        table = Table(title=f"All Opportunities ({len(rows)} total)")
        table.add_column("#", style="dim")
        table.add_column("Title", style="green", max_width=50)
        table.add_column("Company")
        table.add_column("Category", style="cyan")
        table.add_column("Conf", justify="right")
        table.add_column("Active")
        
        for i, row in enumerate(rows, 1):
            conf = f"{row['extractionConfidence']*100:.0f}%" if row['extractionConfidence'] else "N/A"
            active = "✓" if row['isActive'] else "✗"
            table.add_row(
                str(i),
                row['title'][:50],
                row['company'][:20] if row['company'] else "N/A",
                row['category'],
                conf,
                active,
            )
        
        console.print(table)
    finally:
        await sync.close()


@app.command()
def clean_invalid():
    """Remove invalid opportunities (ranking articles, discussions, etc.)."""
    check_database_url()
    asyncio.run(_clean_invalid())


async def _clean_invalid():
    """Delete invalid opportunities from PostgreSQL."""
    from src.api.postgres_sync import get_postgres_sync
    
    sync = get_postgres_sync()
    try:
        await sync.connect()
        async with sync._pool.acquire() as conn:
            # Preview what will be deleted
            to_delete = await conn.fetch('''
                SELECT id, title FROM "Opportunity"
                WHERE title ILIKE '%best %'
                   OR title ILIKE '%ranking%'
                   OR title ILIKE '%discussion%'
                   OR title ILIKE '%bachelor of%'
                   OR "extractionConfidence" < 0.3
            ''')
            
            if not to_delete:
                rprint("[green]No invalid opportunities found![/green]")
                return
            
            rprint(f"[yellow]Will delete {len(to_delete)} invalid opportunities:[/yellow]")
            for row in to_delete:
                rprint(f"  • {row['title'][:60]}")
            
            # Confirm
            if typer.confirm("\nProceed with deletion?"):
                result = await conn.execute('''
                    DELETE FROM "Opportunity"
                    WHERE title ILIKE '%best %'
                       OR title ILIKE '%ranking%'
                       OR title ILIKE '%discussion%'
                       OR title ILIKE '%bachelor of%'
                       OR "extractionConfidence" < 0.3
                ''')
                rprint(f"[green]✓ Deleted invalid opportunities[/green]")
            else:
                rprint("[dim]Cancelled[/dim]")
    finally:
        await sync.close()


@app.command()
def archive_expired():
    """Archive opportunities past their deadline."""
    check_database_url()
    asyncio.run(_archive_expired())


async def _archive_expired():
    """Archive expired opportunities."""
    from src.api.postgres_sync import get_postgres_sync
    
    sync = get_postgres_sync()
    try:
        count = await sync.archive_expired()
        rprint(f"[green]✓ Archived {count} expired opportunities[/green]")
    finally:
        await sync.close()


@app.command()
def reset_queue():
    """Reset all pending URLs to 'pending' status for re-processing."""
    from src.db.sqlite_db import get_sqlite_db
    
    db = get_sqlite_db()
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE pending_urls SET status = 'pending'")
        count = cursor.rowcount
        conn.commit()
    
    rprint(f"[green]✓ Reset {count} URLs to pending status[/green]")


if __name__ == "__main__":
    app()
