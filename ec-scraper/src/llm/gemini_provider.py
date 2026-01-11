"""Gemini LLM Provider implementation."""

import json
from typing import Any, Optional, Type

from google import genai
from google.genai import types
from pydantic import BaseModel

from ..config import get_settings
from .provider import GenerationConfig, LLMProvider


class GeminiProvider(LLMProvider):
    """Gemini API implementation of LLM provider."""
    
    def __init__(self):
        """Initialize Gemini provider."""
        settings = get_settings()
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.model = settings.gemini_pro_model
        self.fast_model = settings.gemini_flash_model
    
    @property
    def name(self) -> str:
        return "gemini"
    
    def _get_model(self, config: Optional[GenerationConfig] = None) -> str:
        """Get model name based on config."""
        if config and config.use_fast_model:
            return self.fast_model
        return self.model
    
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> str:
        """Generate text response using Gemini."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        response = await self.client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=cfg.temperature,
                max_output_tokens=cfg.max_output_tokens,
            ),
        )
        
        return response.text.strip()
    
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        config: Optional[GenerationConfig] = None,
    ) -> Any:
        """Generate structured response using Gemini's native schema support."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        response = await self.client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=schema,
                temperature=cfg.temperature,
                max_output_tokens=cfg.max_output_tokens,
            ),
        )
        
        # Handle parsed response
        if response.parsed:
            parsed = response.parsed
            if hasattr(parsed, 'model_dump'):
                return parsed.model_dump()
            elif hasattr(parsed, 'dict'):
                return parsed.dict()
            elif isinstance(parsed, dict):
                return parsed
            else:
                return dict(parsed)
        
        # Fallback to text parsing
        if response.text:
            return json.loads(response.text.strip())
        
        raise ValueError("Empty response from Gemini")
