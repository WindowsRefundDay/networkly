"""LLM Provider abstraction for dual Gemini/Groq support."""

from .provider import LLMProvider, GenerationConfig
from .gemini_provider import GeminiProvider
from .groq_provider import GroqProvider
from ..config import get_settings

__all__ = ["LLMProvider", "GenerationConfig", "GeminiProvider", "GroqProvider", "get_llm_provider"]


# Singleton instances
_gemini_provider = None
_groq_provider = None


def get_llm_provider() -> LLMProvider:
    """Get the correct LLM provider based on api_mode setting.
    
    Defaults to Google Gemini (api_mode="gemini").
    
    Returns:
        GeminiProvider when api_mode="gemini" (default)
        GroqProvider when api_mode="groq"
    """
    global _gemini_provider, _groq_provider
    
    settings = get_settings()
    
    # Default to Google Gemini
    if settings.api_mode == "groq":
        if _groq_provider is None:
            _groq_provider = GroqProvider()
        return _groq_provider
    else:
        # Default: Google Gemini
        if _gemini_provider is None:
            _gemini_provider = GeminiProvider()
        return _gemini_provider
