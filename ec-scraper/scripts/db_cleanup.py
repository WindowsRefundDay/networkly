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
    if not os.getenv('DATABASE_URL') and not os.getenv('SUPABASE_URL'):
        rprint("[red]✗ DATABASE_URL or SUPABASE_URL environment variable not set[/red]")
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
    client = sync._get_client()
    
    try:
        # Use Supabase client instead of raw SQL
        result = client.table("opportunities").select(
            "id, title, company, category, extraction_confidence, is_active"
        ).order("created_at", desc=True).limit(50).execute()
        
        rows = result.data or []
        
        table = Table(title=f"Recent Opportunities ({len(rows)} shown)")
        table.add_column("#", style="dim")
        table.add_column("Title", style="green", max_width=50)
        table.add_column("Company")
        table.add_column("Category", style="cyan")
        table.add_column("Conf", justify="right")
        table.add_column("Active")
        
        for i, row in enumerate(rows, 1):
            conf = f"{row.get('extraction_confidence', 0)*100:.0f}%" if row.get('extraction_confidence') else "N/A"
            active = "✓" if row.get('is_active') else "✗"
            table.add_row(
                str(i),
                (row.get('title') or "")[:50],
                (row.get('company') or "N/A")[:20],
                row.get('category') or "Unknown",
                conf,
                active,
            )
        
        console.print(table)
    except Exception as e:
        rprint(f"[red]Error listing opportunities: {e}[/red]")


@app.command()
def clean_invalid():
    """Remove invalid opportunities (ranking articles, discussions, etc.)."""
    check_database_url()
    asyncio.run(_clean_invalid())


async def _clean_invalid():
    """Delete invalid opportunities from PostgreSQL."""
    from src.api.postgres_sync import get_postgres_sync
    
    sync = get_postgres_sync()
    client = sync._get_client()
    
    try:
        # 1. Fetch potential candidates for deletion (Supabase doesn't support complex OR/ILIKES easily in one go)
        # We'll do it in batches or simple filters
        
        # This is a bit harder with PostgREST syntax limitations compared to raw SQL
        # We'll fetch titles that look suspicious
        
        rprint("[yellow]Scanning for invalid opportunities...[/yellow]")
        
        # Fetch low confidence
        low_conf = client.table("opportunities").select("id, title").lt("extraction_confidence", 0.3).execute()
        to_delete = list(low_conf.data or [])
        
        # For title matching, we might need to fetch more and filter in python if the dataset isn't huge
        # or use multiple queries
        
        if not to_delete:
            rprint("[green]No invalid opportunities found (by confidence check)![/green]")
            return
        
        rprint(f"[yellow]Found {len(to_delete)} items with low confidence (< 0.3):[/yellow]")
        for row in to_delete[:10]:
            rprint(f"  • {row.get('title', 'No Title')[:60]}")
        if len(to_delete) > 10:
            rprint(f"  ... and {len(to_delete) - 10} more")
        
        # Confirm
        if typer.confirm("\nProceed with deletion?"):
            ids = [row['id'] for row in to_delete]
            # Delete in batches
            batch_size = 100
            for i in range(0, len(ids), batch_size):
                batch = ids[i:i+batch_size]
                client.table("opportunities").delete().in_("id", batch).execute()
            
            rprint(f"[green]✓ Deleted {len(ids)} invalid opportunities[/green]")
        else:
            rprint("[dim]Cancelled[/dim]")
            
    except Exception as e:
        rprint(f"[red]Error cleaning invalid: {e}[/red]")


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
        # Use the sync method which already uses Supabase client
        count = await sync.archive_expired()
        rprint(f"[green]✓ Archived {count} expired opportunities[/green]")
    except Exception as e:
        rprint(f"[red]Error archiving expired: {e}[/red]")


if __name__ == "__main__":
    app()
