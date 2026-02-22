"""Tests for JSON parser utilities."""

import pytest
from src.utils.json_parser import (
    safe_json_loads,
    _strip_code_fences,
    _extract_json,
    _extract_balanced,
    _validate_type,
    _get_fallback,
)


class TestStripCodeFences:
    """Tests for markdown code fence stripping."""

    def test_strips_json_code_fence(self):
        """Test stripping ```json ... ``` fences."""
        input_text = '```json\n{"key": "value"}\n```'
        result = _strip_code_fences(input_text)
        assert result == '{"key": "value"}'

    def test_strips_plain_code_fence(self):
        """Test stripping ``` ... ``` fences without language hint."""
        input_text = '```\n["item1", "item2"]\n```'
        result = _strip_code_fences(input_text)
        assert result == '["item1", "item2"]'

    def test_strips_inline_backticks(self):
        """Test stripping inline backticks wrapping content."""
        input_text = '`{"key": "value"}`'
        result = _strip_code_fences(input_text)
        assert result == '{"key": "value"}'

    def test_preserves_content_without_fences(self):
        """Test that content without code fences is unchanged."""
        input_text = '{"key": "value"}'
        result = _strip_code_fences(input_text)
        assert result == '{"key": "value"}'

    def test_handles_whitespace(self):
        """Test handling of whitespace around content."""
        input_text = '```json\n  {"key": "value"}  \n```'
        result = _strip_code_fences(input_text)
        assert result == '{"key": "value"}'


class TestExtractBalanced:
    """Tests for balanced bracket extraction."""

    def test_extracts_simple_object(self):
        """Test extracting a simple JSON object."""
        text = 'prefix {"key": "value"} suffix'
        result = _extract_balanced(text, '{', '}')
        assert result == '{"key": "value"}'

    def test_extracts_nested_object(self):
        """Test extracting nested JSON objects."""
        text = '{"outer": {"inner": "value"}}'
        result = _extract_balanced(text, '{', '}')
        assert result == '{"outer": {"inner": "value"}}'

    def test_extracts_array(self):
        """Test extracting a JSON array."""
        text = 'result: [1, 2, 3] done'
        result = _extract_balanced(text, '[', ']')
        assert result == '[1, 2, 3]'

    def test_handles_nested_arrays(self):
        """Test extracting nested arrays."""
        text = '[[1, 2], [3, 4]]'
        result = _extract_balanced(text, '[', ']')
        assert result == '[[1, 2], [3, 4]]'

    def test_ignores_brackets_in_strings(self):
        """Test that brackets inside strings are ignored."""
        text = '{"msg": "hello {world}"}'
        result = _extract_balanced(text, '{', '}')
        assert result == '{"msg": "hello {world}"}'

    def test_handles_escaped_quotes(self):
        """Test handling of escaped quotes in strings."""
        text = r'{"msg": "say \"hello\""}'
        result = _extract_balanced(text, '{', '}')
        assert result == r'{"msg": "say \"hello\""}'

    def test_returns_none_for_missing_start(self):
        """Test returning None when start character is missing."""
        text = 'no brackets here'
        result = _extract_balanced(text, '{', '}')
        assert result is None

    def test_returns_none_for_unbalanced(self):
        """Test returning None for unbalanced brackets."""
        text = '{"key": "value"'
        result = _extract_balanced(text, '{', '}')
        assert result is None


class TestExtractJson:
    """Tests for JSON extraction from text."""

    def test_extracts_object_with_type_hint(self):
        """Test extracting object when dict type expected."""
        text = 'result: {"key": "value"}'
        result = _extract_json(text, expected_type=dict)
        assert result == '{"key": "value"}'

    def test_extracts_array_with_type_hint(self):
        """Test extracting array when list type expected."""
        text = 'result: [1, 2, 3]'
        result = _extract_json(text, expected_type=list)
        assert result == '[1, 2, 3]'

    def test_prefers_object_over_array_when_no_hint(self):
        """Test that objects are tried before arrays without type hint."""
        text = '{"key": [1, 2, 3]}'
        result = _extract_json(text, expected_type=None)
        assert result == '{"key": [1, 2, 3]}'

    def test_falls_back_to_array_when_no_object(self):
        """Test falling back to array when no object found."""
        text = 'items: [1, 2, 3]'
        result = _extract_json(text, expected_type=None)
        assert result == '[1, 2, 3]'

    def test_returns_none_for_no_json(self):
        """Test returning None when no JSON found."""
        text = 'just plain text'
        result = _extract_json(text, expected_type=None)
        assert result is None


class TestValidateType:
    """Tests for type validation."""

    def test_validates_dict_type(self):
        """Test validating dict type."""
        assert _validate_type({"key": "value"}, dict) is True
        assert _validate_type([1, 2, 3], dict) is False

    def test_validates_list_type(self):
        """Test validating list type."""
        assert _validate_type([1, 2, 3], list) is True
        assert _validate_type({"key": "value"}, list) is False

    def test_none_type_allows_anything(self):
        """Test that None type allows any value."""
        assert _validate_type({"key": "value"}, None) is True
        assert _validate_type([1, 2, 3], None) is True
        assert _validate_type("string", None) is True
        assert _validate_type(123, None) is True


class TestGetFallback:
    """Tests for fallback value determination."""

    def test_returns_explicit_fallback(self):
        """Test returning explicit fallback value."""
        assert _get_fallback(dict, "custom") == "custom"
        assert _get_fallback(list, [1, 2, 3]) == [1, 2, 3]

    def test_returns_empty_dict_for_dict_type(self):
        """Test returning empty dict when dict type expected."""
        assert _get_fallback(dict, None) == {}

    def test_returns_empty_list_for_list_type(self):
        """Test returning empty list when list type expected."""
        assert _get_fallback(list, None) == []

    def test_returns_none_for_unknown_type(self):
        """Test returning None when type is unknown."""
        assert _get_fallback(None, None) is None
        assert _get_fallback(str, None) is None


class TestSafeJsonLoads:
    """Tests for the main safe_json_loads function."""

    def test_parses_clean_json_object(self):
        """Test parsing clean JSON object."""
        result = safe_json_loads('{"key": "value"}')
        assert result == {"key": "value"}

    def test_parses_clean_json_array(self):
        """Test parsing clean JSON array."""
        result = safe_json_loads('[1, 2, 3]')
        assert result == [1, 2, 3]

    def test_parses_json_with_code_fences(self):
        """Test parsing JSON wrapped in code fences."""
        result = safe_json_loads('```json\n{"key": "value"}\n```')
        assert result == {"key": "value"}

    def test_extracts_json_from_mixed_content(self):
        """Test extracting JSON from mixed text content."""
        text = 'Here is the result: {"key": "value"} Hope that helps!'
        result = safe_json_loads(text, expected_type=dict)
        assert result == {"key": "value"}

    def test_returns_fallback_for_empty_input(self):
        """Test returning fallback for empty input."""
        assert safe_json_loads("") is None
        assert safe_json_loads("", expected_type=dict) == {}
        assert safe_json_loads("", expected_type=list) == []

    def test_returns_fallback_for_whitespace_input(self):
        """Test returning fallback for whitespace-only input."""
        assert safe_json_loads("   \n\t  ", expected_type=dict) == {}

    def test_returns_fallback_for_invalid_json(self):
        """Test returning fallback for unparseable JSON."""
        assert safe_json_loads("not json", expected_type=dict) == {}
        assert safe_json_loads("{broken", expected_type=dict) == {}

    def test_validates_expected_type(self):
        """Test that expected type is validated."""
        # Valid dict but expecting list
        result = safe_json_loads('{"key": "value"}', expected_type=list)
        assert result == []

        # Valid list but expecting dict
        result = safe_json_loads('[1, 2, 3]', expected_type=dict)
        assert result == {}

    def test_uses_custom_fallback(self):
        """Test using custom fallback value."""
        result = safe_json_loads("invalid", expected_type=list, fallback=[1])
        assert result == [1]

    def test_handles_nested_structures(self):
        """Test handling deeply nested JSON."""
        text = '{"a": {"b": {"c": [1, 2, {"d": "deep"}]}}}'
        result = safe_json_loads(text)
        assert result == {"a": {"b": {"c": [1, 2, {"d": "deep"}]}}}

    def test_handles_llm_response_with_explanation(self):
        """Test handling LLM response that includes explanation text."""
        text = '''Here are the queries you requested:

```json
["query 1", "query 2", "query 3"]
```

Let me know if you need more!'''
        result = safe_json_loads(text, expected_type=list)
        assert result == ["query 1", "query 2", "query 3"]

    def test_handles_multiline_json(self):
        """Test handling multiline JSON formatting."""
        text = '''{
    "key1": "value1",
    "key2": "value2"
}'''
        result = safe_json_loads(text)
        assert result == {"key1": "value1", "key2": "value2"}

    def test_handles_unicode(self):
        """Test handling Unicode characters."""
        result = safe_json_loads('{"emoji": "\ud83d\ude80", "chinese": "\u4f60\u597d"}')
        assert result == {"emoji": "\ud83d\ude80", "chinese": "\u4f60\u597d"}

    def test_handles_special_json_values(self):
        """Test handling special JSON values (null, boolean, numbers)."""
        result = safe_json_loads('{"null": null, "bool": true, "num": 3.14}')
        assert result == {"null": None, "bool": True, "num": 3.14}
