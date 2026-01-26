"""Gemini LLM Provider implementation with fallback and timeout handling."""

import asyncio
import json
import sys
from typing import Any, Optional, Type
import random
import logging

from google import genai
from google.genai import types
from pydantic import BaseModel

from ..config import get_settings
from .provider import GenerationConfig, LLMProvider


# Error messages that indicate model is unavailable
MODEL_UNAVAILABLE_ERRORS = (
    "does not exist",
    "do not have access",
    "not found",
    "invalid model",
    "404",
)


class GeminiProvider(LLMProvider):
    """Gemini API implementation of LLM provider with robust fallback and Vertex AI optimization."""
    
    def __init__(self):
        """Initialize Gemini provider."""
        settings = get_settings()
        
        # Initialize client based on Vertex AI mode
        if settings.use_vertex_ai:
            if not settings.vertex_project_id:
                raise ValueError(
                    "VERTEX_PROJECT_ID is required when USE_VERTEX_AI=true. "
                    "Set it in your .env file or environment variables."
                )
            
            # Deep Vertex AI integration using google.genai
            self.client = genai.Client(
                vertexai=True,
                project=settings.vertex_project_id,
                location=settings.vertex_location,
            )
        else:
            if not settings.GOOGLE_API_KEY:
                raise ValueError(
                    "GOOGLE_API_KEY is required when USE_VERTEX_AI=false. "
                    "Set it in your .env file or use Vertex AI mode."
                )
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        
        self.model = settings.gemini_pro_model
        self.fast_model = settings.gemini_flash_model
        self._llm_timeout = settings.llm_timeout_seconds
        self._max_retries = settings.max_retries
        self._retry_base_delay = settings.retry_base_delay
        self._retry_max_delay = settings.retry_max_delay
        self._unavailable_models: set = set()
        self._rate_limit_lock = asyncio.Lock()
        self._last_request_time: float = 0.0
    
    @property
    def name(self) -> str:
        return "gemini-vertex"
    
    def _get_model(self, config: Optional[GenerationConfig] = None, fallback: bool = False) -> str:
        """Get model name based on config, with fallback support."""
        if fallback:
            return self.model
        
        if config and config.use_fast_model:
            if self.fast_model in self._unavailable_models:
                return self.model
            return self.fast_model
        return self.model
    
    async def _throttle(self) -> None:
        """Smart throttling for Vertex AI quotas."""
        async with self._rate_limit_lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self._last_request_time
            
            # Vertex AI typically has 60-120 RPM limits depending on region/model
            # We want to stay well below that to avoid 429s
            # 2.0s = ~30 requests/min per process
            settings = get_settings()
            min_interval = 2.0 if settings.use_vertex_ai else 1.0
            
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            self._last_request_time = asyncio.get_event_loop().time()
    
    async def _generate_core(
        self,
        model: str,
        prompt: str,
        config: GenerationConfig,
        schema: Optional[Type[BaseModel]] = None,
        is_retry: bool = False
    ) -> Any:
        """Core generation logic with automatic retry for specific failures."""
        
        # Auto-increase tokens for retries or known complex models
        max_tokens = config.max_output_tokens
        if is_retry:
            max_tokens = max(8192, max_tokens * 2)  # Significantly boost tokens on retry
        
        gen_config_args = {
            "temperature": config.temperature,
            "max_output_tokens": max_tokens,
        }
        
        if schema:
            gen_config_args["response_mime_type"] = "application/json"
            gen_config_args["response_schema"] = schema
        
        try:
            await self._throttle()
            
            response = await asyncio.wait_for(
                self.client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(**gen_config_args),
                ),
                timeout=self._llm_timeout * (2.0 if is_retry else 1.0),
            )
            
            return response
            
        except Exception as e:
            error_str = str(e).lower()
            if "429" in error_str or "resource_exhausted" in error_str:
                # Let top-level retry handle rate limits with backoff
                raise
            # Wrap other errors for context
            raise RuntimeError(f"GenAI Error ({model}): {str(e)}") from e

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        config: Optional[GenerationConfig] = None,
    ) -> Any:
        """Generate structured response using Gemini with robust fallback."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        # Retry loop
        for attempt in range(self._max_retries + 1):
            try:
                # Use current model choice
                current_model = model
                
                # If we are retrying and using fast model, upgrade to Pro
                if attempt > 0 and model == self.fast_model:
                    current_model = self.model
                
                response = await self._generate_core(
                    current_model, 
                    prompt, 
                    cfg, 
                    schema, 
                    is_retry=(attempt > 0)
                )
                
                # Check finish reason
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    finish_reason = str(getattr(candidate, 'finish_reason', '')).upper()
                    
                    if "MAX_TOKENS" in finish_reason:
                        sys.stderr.write(f"[Gemini] Attempt {attempt+1}: Response truncated (MAX_TOKENS). Retrying with Pro...\n")
                        # Force Pro model next time
                        model = self.model
                        continue
                
                # Try to get parsed response
                if response.parsed:
                    # Handle Pydantic model dump
                    if hasattr(response.parsed, 'model_dump'):
                        return response.parsed.model_dump()
                    elif hasattr(response.parsed, 'dict'):
                        return response.parsed.dict()
                    return response.parsed
                
                # Fallback to text parsing
                text = response.text or ""
                from ..utils.json_parser import safe_json_loads
                result = safe_json_loads(text, expected_type=dict)
                if result:
                    return result
                
                raise ValueError("Could not parse JSON from response")
                
            except Exception as e:
                if attempt == self._max_retries:
                    raise
                
                # Backoff
                delay = (2 ** attempt) + random.uniform(0.1, 1.0)
                await asyncio.sleep(delay)
                continue
                
        raise RuntimeError("Max retries exceeded")

    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> str:
        """Generate text response."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        for attempt in range(self._max_retries + 1):
            try:
                response = await self._generate_core(model, prompt, cfg, is_retry=(attempt > 0))
                return response.text.strip()
            except Exception:
                if attempt == self._max_retries:
                    raise
                await asyncio.sleep(1.0)
        return ""
