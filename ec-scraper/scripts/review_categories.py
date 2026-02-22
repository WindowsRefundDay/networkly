"""Review and manage suggested categories for EC opportunities."""

import sys
from pathlib import Path
from collections import Counter

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from rich import print as rprint
from rich.console import Console
from rich.table import Table

from src.db.sqlite_db import get_sqlite_db
from src.db.models import ECCategory

console = Console()


def list_suggested_categories():
    """List all suggested category names and their frequency."""
    db = get_sqlite_db()
    
    # Get all opportunities with suggested categories
    opportunities = db.get_all_opportunities(limit=10000)
    suggested = [
        ec.suggested_category 
        for ec in opportunities 
        if ec.category == ECCategory.OTHER and ec.suggested_category
    ]
    
    if not suggested:
        rprint("[yellow]No suggested categories found yet.[/yellow]")
        rprint("[dim]Suggested categories appear when the AI assigns 'Other' as the category.[/dim]")
        return
    
    # Count occurrences
    counts = Counter(suggested)
    
    rprint(f"\n[blue]Suggested Categories ({len(suggested)} total)[/blue]\n")
    
    table = Table(title="Category Review")
    table.add_column("Suggested Category", style="cyan")
    table.add_column("Count", style="green")
    table.add_column("Action", style="dim")
    
    for category, count in counts.most_common():
        action = "Consider adding to ECCategory enum" if count >= 3 else "Monitor"
        table.add_row(category, str(count), action)
    
    console.print(table)
    
    # Show which could be added
    frequent = [cat for cat, count in counts.items() if count >= 3]
    if frequent:
        rprint(f"\n[green]Categories to consider adding to enum:[/green]")
        for cat in frequent:
            rprint(f"  • {cat}")


def show_opportunities_with_category(category_name: str):
    """Show opportunities with a specific suggested category."""
    db = get_sqlite_db()
    opportunities = db.get_all_opportunities(limit=10000)
    
    matching = [
        ec for ec in opportunities 
        if ec.suggested_category and ec.suggested_category.lower() == category_name.lower()
    ]
    
    if not matching:
        rprint(f"[yellow]No opportunities found with suggested category '{category_name}'[/yellow]")
        return
    
    rprint(f"\n[blue]Opportunities with suggested category '{category_name}':[/blue]\n")
    
    for ec in matching:
        rprint(f"[green]{ec.title}[/green]")
        rprint(f"  [dim]{ec.url}[/dim]")
        rprint(f"  {ec.summary[:100]}...\n" if len(ec.summary) > 100 else f"  {ec.summary}\n")


if __name__ == "__main__":
    import typer
    
    app = typer.Typer(help="Review suggested categories")
    
    @app.command()
    def list():
        """List all suggested categories and their frequency."""
        list_suggested_categories()
    
    @app.command()
    def show(category: str):
        """Show opportunities with a specific suggested category."""
        show_opportunities_with_category(category)
    
    app()
