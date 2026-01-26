"""LLM Provider abstraction using Google Gemini."""

from .provider import LLMProvider, GenerationConfig
from .gemini_provider import GeminiProvider

__all__ = ["LLMProvider", "GenerationConfig", "GeminiProvider", "get_llm_provider"]


# Singleton instance
_gemini_provider = None


def get_llm_provider() -> LLMProvider:
    """Get the Gemini LLM provider.
    
    Returns:
        GeminiProvider singleton instance
    """
    global _gemini_provider
    
    if _gemini_provider is None:
        _gemini_provider = GeminiProvider()
    return _gemini_provider
