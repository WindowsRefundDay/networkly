"""Safe JSON parsing utilities with error recovery."""

import json
import re
from typing import Any, Optional, Union


def safe_json_loads(
    text: str,
    expected_type: Optional[type] = None,
    fallback: Any = None,
) -> Any:
    """
    Safely parse JSON with multiple fallback strategies.
    
    Handles common LLM response issues:
    - Markdown code fences (```json ... ```)
    - Unterminated strings
    - Extra text before/after JSON
    - Malformed JSON
    
    Args:
        text: Text potentially containing JSON
        expected_type: Expected type (dict, list, etc.) - if provided, validates return type
        fallback: Value to return if parsing fails (defaults to {} for dict, [] for list)
        
    Returns:
        Parsed JSON or fallback value
    """
    if not text or not text.strip():
        return _get_fallback(expected_type, fallback)
    
    text = text.strip()
    
    # Strategy 1: Try direct parse (fast path)
    try:
        result = json.loads(text)
        if _validate_type(result, expected_type):
            return result
    except (json.JSONDecodeError, ValueError):
        pass
    
    # Strategy 2: Strip markdown code fences
    cleaned = _strip_code_fences(text)
    if cleaned != text:
        try:
            result = json.loads(cleaned)
            if _validate_type(result, expected_type):
                return result
        except (json.JSONDecodeError, ValueError):
            pass
    
    # Strategy 3: Extract first balanced JSON object/array
    extracted = _extract_json(cleaned, expected_type)
    if extracted:
        try:
            result = json.loads(extracted)
            if _validate_type(result, expected_type):
                return result
        except (json.JSONDecodeError, ValueError):
            pass
    
    # All strategies failed - return fallback
    return _get_fallback(expected_type, fallback)


def _strip_code_fences(text: str) -> str:
    """Remove markdown code fences from text."""
    # Remove ```json ... ``` or ``` ... ```
    text = re.sub(r'^```(?:json)?\s*\n', '', text)
    text = re.sub(r'\n```\s*$', '', text)
    # Remove inline backticks if they wrap the entire thing
    if text.startswith('`') and text.endswith('`'):
        text = text[1:-1]
    return text.strip()


def _extract_json(text: str, expected_type: Optional[type] = None) -> Optional[str]:
    """
    Extract the first valid JSON object or array from text.
    
    Uses bracket/brace counting to find balanced JSON.
    """
    # Determine what we're looking for
    if expected_type == list:
        start_chars = ['[']
        pairs = {'[': ']'}
    elif expected_type == dict:
        start_chars = ['{']
        pairs = {'{': '}'}
    else:
        # Try both
        start_chars = ['{', '[']
        pairs = {'{': '}', '[': ']'}
    
    for start_char in start_chars:
        result = _extract_balanced(text, start_char, pairs[start_char])
        if result:
            return result
    
    return None


def _extract_balanced(text: str, start: str, end: str) -> Optional[str]:
    """Extract balanced bracket/brace content."""
    start_idx = text.find(start)
    if start_idx == -1:
        return None
    
    depth = 0
    in_string = False
    escape = False
    
    for i in range(start_idx, len(text)):
        char = text[i]
        
        # Handle string escapes
        if escape:
            escape = False
            continue
        
        if char == '\\':
            escape = True
            continue
        
        # Track string state (to ignore brackets inside strings)
        if char == '"':
            in_string = not in_string
            continue
        
        if in_string:
            continue
        
        # Count depth
        if char == start:
            depth += 1
        elif char == end:
            depth -= 1
            if depth == 0:
                return text[start_idx:i+1]
    
    return None


def _validate_type(value: Any, expected_type: Optional[type]) -> bool:
    """Check if value matches expected type."""
    if expected_type is None:
        return True
    return isinstance(value, expected_type)


def _get_fallback(expected_type: Optional[type], fallback: Any) -> Any:
    """Get appropriate fallback value."""
    if fallback is not None:
        return fallback
    if expected_type == list:
        return []
    if expected_type == dict:
        return {}
    return None
