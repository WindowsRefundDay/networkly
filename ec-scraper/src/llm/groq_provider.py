"""Groq LLM Provider implementation."""

import json
from typing import Any, Optional, Type

from pydantic import BaseModel

from ..config import get_settings
from .provider import GenerationConfig, LLMProvider


class GroqProvider(LLMProvider):
    """Groq API implementation of LLM provider."""
    
    def __init__(self):
        """Initialize Groq provider."""
        settings = get_settings()
        
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required when using Groq provider")
        
        # Import groq only when needed
        from groq import AsyncGroq
        
        self.client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        self.model = settings.groq_model
        self.fast_model = settings.groq_fast_model
    
    @property
    def name(self) -> str:
        return "groq"
    
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
        """Generate text response using Groq."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=cfg.temperature,
            max_tokens=cfg.max_output_tokens,
        )
        
        return response.choices[0].message.content.strip()
    
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        config: Optional[GenerationConfig] = None,
    ) -> Any:
        """Generate structured response using Groq's JSON mode.
        
        Note: Groq doesn't have native schema validation like Gemini,
        so we use JSON mode and validate on our end.
        """
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        # Build schema instruction for the prompt
        schema_json = schema.model_json_schema()
        enhanced_prompt = f"""{prompt}

Respond with ONLY valid JSON matching this schema:
{json.dumps(schema_json, indent=2)}"""
        
        response = await self.client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": enhanced_prompt}],
            temperature=cfg.temperature,
            max_tokens=cfg.max_output_tokens,
            response_format={"type": "json_object"},
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up markdown if present
        if content.startswith("```"):
            lines = content.split("\n")
            if lines[-1].strip() == "```":
                lines = lines[1:-1]
            else:
                lines = lines[1:]
            content = "\n".join(lines)
        
        return json.loads(content)
