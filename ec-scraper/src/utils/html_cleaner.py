"""HTML cleaning utility using readability-lxml + BeautifulSoup."""

from readability import Document
from bs4 import BeautifulSoup
from typing import Optional


def clean_html_for_llm(html: str, max_chars: int = 8000) -> str:
    """
    Extract clean text from HTML optimized for LLM input.

    Uses readability-lxml to extract main content, then BeautifulSoup
    to strip remaining tags and normalize whitespace.

    Args:
        html: Raw HTML string
        max_chars: Maximum characters to return (default 8KB)

    Returns:
        Cleaned text suitable for LLM prompt
    """
    try:
        # Step 1: Extract main content using readability
        doc = Document(html)
        main_html = doc.summary()

        # Step 2: Parse with BeautifulSoup
        soup = BeautifulSoup(main_html, 'html.parser')

        # Remove script, style, nav, footer
        for tag in soup(['script', 'style', 'nav', 'footer', 'iframe']):
            tag.decompose()

        # Extract text
        text = soup.get_text(separator='\n', strip=True)

        # Step 3: Normalize whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        # Step 4: Truncate to max_chars
        if len(text) > max_chars:
            text = text[:max_chars] + "... [truncated]"

        return text

    except Exception as e:
        # Fallback: basic text extraction
        soup = BeautifulSoup(html, 'html.parser')
        text = soup.get_text(separator=' ', strip=True)
        return text[:max_chars] if len(text) > max_chars else text
