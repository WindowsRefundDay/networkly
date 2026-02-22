"""EC Scraper CLI - Main entry point.

Simplified architecture: PostgreSQL is the single source of truth.
SQLite only tracks pending URL queue. ChromaDB for semantic search.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Optional

import typer
from rich import print as rprint
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn

# Add src to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.agents.extractor import get_extractor
from src.crawlers.crawl4ai_client import get_crawler
from src.db.models import PendingURL
from src.db.sqlite_db import get_sqlite_db
from src.db.vector_db import get_vector_db
from src.embeddings.gemini import get_embeddings
from src.api.postgres_sync import get_postgres_sync

app = typer.Typer(
    name="ec-scraper",
    help="Intelligent extracurricular opportunity scraper",
)
console = Console()


def check_database_url():
    """Ensure DATABASE_URL is configured."""
    if not os.getenv('DATABASE_URL'):
        rprint("[red]✗ DATABASE_URL environment variable not set[/red]")  
        rprint("[dim]Export your Postgres connection string:[/dim]")
        rprint("  export DATABASE_URL='postgresql://...'")
        raise typer.Exit(1)


@app.command()
def extract(
    url: str = typer.Argument(..., help="URL to extract EC information from"),
    save: bool = typer.Option(False, "--save", "-s", help="Save to PostgreSQL database"),
):
    """Extract EC information from a single URL."""
    if save:
        check_database_url()
    asyncio.run(_extract_url(url, save))


async def _extract_url(url: str, save: bool):
    """Async implementation of extract command."""
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        # Crawl
        task = progress.add_task("Crawling URL...", total=None)
        crawler = get_crawler()
        result = await crawler.crawl(url)
        
        if not result.success:
            rprint(f"[red]✗ Crawl failed:[/red] {result.error}")
            return
        
        progress.update(task, description="Extracting information...")
        
        # Extract
        extractor = get_extractor()
        extraction = await extractor.extract(result.markdown, url)
        
        if not extraction.success:
            rprint(f"[red]✗ Extraction failed:[/red] {extraction.error}")
            return
        
        progress.update(task, description="Done!")
    
    # Display result
    ec = extraction.ec_card
    rprint("\n[green]✓ Extraction successful![/green]\n")
    
    table = Table(title=ec.title, show_header=False)
    table.add_column("Field", style="cyan")
    table.add_column("Value")
    
    table.add_row("Category", ec.category.value)
    if ec.suggested_category:
        table.add_row("Suggested Category", f"[yellow]{ec.suggested_category}[/yellow]")
    table.add_row("Type", ec.ec_type.value)
    table.add_row("Organization", ec.organization or "N/A")
    table.add_row("Summary", ec.summary[:200] + "..." if len(ec.summary) > 200 else ec.summary)
    table.add_row("Grades", ", ".join(map(str, ec.grade_levels)) or "All")
    table.add_row("Location", f"{ec.location_type.value}" + (f" - {ec.location}" if ec.location else ""))
    table.add_row("Deadline", str(ec.deadline.date()) if ec.deadline else "N/A")
    table.add_row("Cost", ec.cost or "N/A")
    table.add_row("Tags", ", ".join(ec.tags) if ec.tags else "N/A")
    table.add_row("Confidence", f"{extraction.confidence:.0%}")
    
    console.print(table)
    
    if save:
        # Save directly to PostgreSQL (single source of truth)
        sync = get_postgres_sync()
        try:
            opp_id = await sync.upsert_opportunity(ec)
            rprint(f"\n[green]✓ Saved to PostgreSQL[/green] (ID: {opp_id[:8]}...)")
            
            # Also add to vector store for semantic search
            embeddings = get_embeddings()
            vector_db = get_vector_db()
            embedding = embeddings.generate_for_indexing(ec.to_embedding_text())
            vector_db.add_ec_with_embedding(ec, embedding)
            rprint(f"[green]✓ Added to vector index[/green]")
        except Exception as e:
            rprint(f"[red]✗ Failed to save: {e}[/red]")
        finally:
            await sync.close()


@app.command()
def run(
    limit: int = typer.Option(10, "--limit", "-l", help="Max URLs to process"),
):
    """Process pending URLs from the queue."""
    check_database_url()
    asyncio.run(_run_batch(limit))


async def _run_batch(limit: int):
    """Process a batch of pending URLs.
    
    Simplified flow:
    1. Get pending URLs from SQLite queue
    2. Crawl each URL
    3. Extract with LLM
    4. Save directly to PostgreSQL (single source of truth)
    5. Add embeddings to ChromaDB for semantic search
    """
    db = get_sqlite_db()
    pending = db.get_pending_urls(limit)
    
    if not pending:
        rprint("[yellow]No pending URLs to process. Run 'seed_sources.py' first.[/yellow]")
        return
    
    rprint(f"[blue]Processing {len(pending)} URLs...[/blue]\n")
    
    crawler = get_crawler()
    extractor = get_extractor()
    embeddings = get_embeddings()
    vector_db = get_vector_db()
    sync = get_postgres_sync()
    
    success_count = 0
    
    try:
        for pending_url in pending:
            rprint(f"[dim]→ {pending_url.url}[/dim]")
            db.update_pending_status(pending_url.url, "processing")
            
            # Crawl
            result = await crawler.crawl(pending_url.url)
            if not result.success:
                rprint(f"  [red]✗ Crawl failed: {result.error}[/red]")
                db.update_pending_status(pending_url.url, "failed")
                continue
            
            # Extract
            extraction = await extractor.extract(result.markdown, pending_url.url, pending_url.source)
            if not extraction.success:
                rprint(f"  [red]✗ Extraction failed: {extraction.error}[/red]")
                db.update_pending_status(pending_url.url, "failed")
                continue
            
            # Save directly to PostgreSQL (single source of truth)
            ec = extraction.ec_card
            try:
                opp_id = await sync.upsert_opportunity(ec)
                
                # Add embeddings for semantic search
                embedding = embeddings.generate_for_indexing(ec.to_embedding_text())
                vector_db.add_ec_with_embedding(ec, embedding)
                
                db.update_pending_status(pending_url.url, "completed")
                rprint(f"  [green]✓ {ec.title}[/green]")
                success_count += 1
            except Exception as e:
                rprint(f"  [red]✗ Save failed: {e}[/red]")
                db.update_pending_status(pending_url.url, "failed")
    finally:
        await sync.close()
    
    rprint(f"\n[green]Processed {success_count}/{len(pending)} URLs successfully[/green]")


@app.command()
def search(
    query: str = typer.Argument(..., help="Search query"),
    semantic: bool = typer.Option(True, "--semantic/--text", help="Use semantic search"),
    limit: int = typer.Option(10, "--limit", "-l", help="Max results"),
):
    """Search opportunities using semantic search."""
    asyncio.run(_search(query, semantic, limit))


async def _search(query: str, semantic: bool, limit: int):
    """Search opportunities."""
    if semantic:
        # Semantic search using embeddings
        embeddings = get_embeddings()
        vector_db = get_vector_db()
        
        query_embedding = embeddings.generate_query_embedding(query)
        results = vector_db.search_similar(query_embedding, limit=limit)
        
        if not results:
            rprint("[yellow]No results found in vector index[/yellow]")
            return
        
        rprint(f"\n[blue]Semantic search results for:[/blue] {query}\n")
        
        for ec_id, similarity, metadata in results:
            rprint(f"[green]{metadata.get('title', 'Unknown')}[/green] ({similarity:.0%} match)")
            rprint(f"  [dim]{metadata.get('category', 'Other')} | {metadata.get('ec_type', 'Other')}[/dim]")
            rprint(f"  {metadata.get('url', 'N/A')}\n")
    else:
        rprint("[yellow]Text search requires PostgreSQL full-text search (not yet implemented)[/yellow]")


@app.command()
def stats():
    """Show database statistics."""
    check_database_url()
    asyncio.run(_stats())


async def _stats():
    """Show stats from both databases."""
    db = get_sqlite_db()
    vector_db = get_vector_db()
    sync = get_postgres_sync()
    
    try:
        await sync.connect()
        async with sync._pool.acquire() as conn:
            pg_count = await conn.fetchval('SELECT COUNT(*) FROM "Opportunity"')
            active_count = await conn.fetchval('SELECT COUNT(*) FROM "Opportunity" WHERE "isActive" = true')
    finally:
        await sync.close()
    
    pending = db.get_pending_urls(limit=10000)
    pending_count = len([p for p in pending if p.status == "pending"])
    completed_count = len([p for p in pending if p.status == "completed"])
    vector_count = vector_db.count()
    
    rprint("\n[blue]EC Scraper Statistics[/blue]\n")
    rprint(f"  [cyan]PostgreSQL (Production):[/cyan]")
    rprint(f"    Total opportunities:  {pg_count}")
    rprint(f"    Active opportunities: {active_count}")
    rprint(f"\n  [cyan]SQLite (URL Queue):[/cyan]")
    rprint(f"    Pending URLs:         {pending_count}")
    rprint(f"    Completed URLs:       {completed_count}")
    rprint(f"\n  [cyan]ChromaDB (Vector Index):[/cyan]")
    rprint(f"    Indexed embeddings:   {vector_count}")


@app.command()
def list_all(
    limit: int = typer.Option(20, "--limit", "-l", help="Max results"),
):
    """List all opportunities from PostgreSQL."""
    check_database_url()
    asyncio.run(_list_all(limit))


async def _list_all(limit: int):
    """List opportunities from PostgreSQL."""
    sync = get_postgres_sync()
    try:
        await sync.connect()
        async with sync._pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT id, title, company, category, type, "extractionConfidence", deadline
                FROM "Opportunity" 
                WHERE "isActive" = true
                ORDER BY "createdAt" DESC
                LIMIT $1
            ''', limit)
        
        if not rows:
            rprint("[yellow]No opportunities in database yet[/yellow]")
            return
        
        table = Table(title=f"EC Opportunities ({len(rows)} shown)")
        table.add_column("Title", style="green", max_width=40)
        table.add_column("Organization", style="dim")
        table.add_column("Category", style="cyan")
        table.add_column("Type")
        table.add_column("Conf", justify="right")
        
        for row in rows:
            conf = f"{row['extractionConfidence']*100:.0f}%" if row['extractionConfidence'] else "N/A"
            table.add_row(
                row['title'][:40],
                row['company'][:20] if row['company'] else "N/A",
                row['category'],
                row['type'],
                conf,
            )
        
        console.print(table)
    finally:
        await sync.close()


@app.command()
def add_url(
    url: str = typer.Argument(..., help="URL to add to pending queue"),
    source: str = typer.Option("manual", "--source", "-s", help="Source label"),
    priority: int = typer.Option(5, "--priority", "-p", help="Priority (0-10)"),
):
    """Add a URL to the pending queue for processing."""
    db = get_sqlite_db()
    pending = PendingURL(url=url, source=source, priority=priority)
    
    if db.add_pending_url(pending):
        rprint(f"[green]✓ Added to queue:[/green] {url}")
    else:
        rprint(f"[yellow]URL already in queue:[/yellow] {url}")


@app.command()
def clear_queue():
    """Clear all pending URLs from the queue."""
    db = get_sqlite_db()
    with db._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM pending_urls WHERE status = 'pending'")
        count = cursor.rowcount
        conn.commit()
    rprint(f"[green]Cleared {count} pending URLs from queue[/green]")


if __name__ == "__main__":
    app()
