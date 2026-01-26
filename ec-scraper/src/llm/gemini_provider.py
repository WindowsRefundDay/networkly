"""Gemini LLM Provider implementation with fallback and timeout handling."""

import asyncio
import json
import sys
from typing import Any, Optional, Type

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
)


class GeminiProvider(LLMProvider):
    """Gemini API implementation of LLM provider with fallback support."""
    
    def __init__(self):
        """Initialize Gemini provider."""
        settings = get_settings()
        
        # Initialize client based on Vertex AI mode
        if settings.use_vertex_ai:
            # Validate Vertex configuration
            if not settings.vertex_project_id:
                raise ValueError(
                    "VERTEX_PROJECT_ID is required when USE_VERTEX_AI=true. "
                    "Set it in your .env file or environment variables."
                )
            
            # Use Vertex AI with IAM authentication
            self.client = genai.Client(
                vertexai=True,
                project=settings.vertex_project_id,
                location=settings.vertex_location,
            )
        else:
            # Use Gemini Developer API with API key
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
        # Track which models have failed to avoid repeated failures
        self._unavailable_models: set = set()
        self._rate_limit_lock = asyncio.Lock()
        self._last_request_time: float = 0.0
    
    @property
    def name(self) -> str:
        return "gemini"
    
    def _get_model(self, config: Optional[GenerationConfig] = None, fallback: bool = False) -> str:
        """Get model name based on config, with fallback support."""
        if fallback:
            # Always return main model as fallback
            return self.model
        
        if config and config.use_fast_model:
            # Skip fast model if we know it's unavailable
            if self.fast_model in self._unavailable_models:
                return self.model
            return self.fast_model
        return self.model
    
    def _is_model_unavailable_error(self, error: Exception) -> bool:
        """Check if error indicates model is unavailable."""
        error_str = str(error).lower()
        return any(msg in error_str for msg in MODEL_UNAVAILABLE_ERRORS)

    def _is_rate_limit_error(self, error: Exception) -> bool:
        """Check if error indicates rate limiting."""
        error_str = str(error).lower()
        return "resource_exhausted" in error_str or "429" in error_str or "rate limit" in error_str

    def _get_retry_delay(self, error: Exception, attempt: int) -> float:
        """Extract retry delay or compute exponential backoff."""
        error_str = str(error).lower()
        import re
        retry_match = re.search(r'retry in (\d+(?:\.\d+)?)', error_str)
        if retry_match:
            return min(float(retry_match.group(1)) + 0.5, self._retry_max_delay)
        delay = min(self._retry_base_delay * (2 ** attempt), self._retry_max_delay)
        return delay

    async def _throttle(self) -> None:
        """Lightweight throttle to reduce bursty RPM spikes."""
        async with self._rate_limit_lock:
            now = asyncio.get_event_loop().time()
            elapsed = now - self._last_request_time
            min_interval = 1.0
            if elapsed < min_interval:
                await asyncio.sleep(min_interval - elapsed)
            self._last_request_time = asyncio.get_event_loop().time()
    
    async def _generate_with_timeout(
        self,
        model: str,
        prompt: str,
        cfg: GenerationConfig,
    ) -> Any:
        """Execute generation with timeout protection."""
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                await self._throttle()
                return await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=cfg.temperature,
                            max_output_tokens=cfg.max_output_tokens,
                        ),
                    ),
                    timeout=self._llm_timeout,
                )
            except Exception as e:
                last_error = e
                if self._is_rate_limit_error(e) and attempt < self._max_retries:
                    await asyncio.sleep(self._get_retry_delay(e, attempt))
                    continue
                raise
        raise last_error
    
    async def _generate_structured_with_timeout(
        self,
        model: str,
        prompt: str,
        schema: Type[BaseModel],
        cfg: GenerationConfig,
    ) -> Any:
        """Execute structured generation with timeout protection."""
        last_error: Exception | None = None
        for attempt in range(self._max_retries + 1):
            try:
                await self._throttle()
                return await asyncio.wait_for(
                    self.client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=schema,
                            temperature=cfg.temperature,
                            max_output_tokens=cfg.max_output_tokens,
                        ),
                    ),
                    timeout=self._llm_timeout,
                )
            except Exception as e:
                last_error = e
                if self._is_rate_limit_error(e) and attempt < self._max_retries:
                    await asyncio.sleep(self._get_retry_delay(e, attempt))
                    continue
                raise
        raise last_error
    
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> str:
        """Generate text response using Gemini with fallback on model errors."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        try:
            response = await self._generate_with_timeout(model, prompt, cfg)
            return response.text.strip()
        except asyncio.TimeoutError:
            raise TimeoutError(f"LLM generation timed out after {self._llm_timeout}s")
        except Exception as e:
            # Check if we should fallback to main model
            if self._is_model_unavailable_error(e) and model != self.model:
                sys.stderr.write(
                    f"[GeminiProvider] Model '{model}' unavailable, falling back to '{self.model}'\n"
                )
                self._unavailable_models.add(model)
                # Retry with fallback model
                try:
                    response = await self._generate_with_timeout(self.model, prompt, cfg)
                    return response.text.strip()
                except asyncio.TimeoutError:
                    raise TimeoutError(f"LLM generation timed out after {self._llm_timeout}s")
            raise
    
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        config: Optional[GenerationConfig] = None,
    ) -> Any:
        """Generate structured response using Gemini with fallback on model errors."""
        cfg = config or GenerationConfig()
        model = self._get_model(config)
        
        try:
            response = await self._generate_structured_with_timeout(model, prompt, schema, cfg)
        except asyncio.TimeoutError:
            raise TimeoutError(f"LLM structured generation timed out after {self._llm_timeout}s")
        except Exception as e:
            # Check if we should fallback to main model
            if self._is_model_unavailable_error(e) and model != self.model:
                sys.stderr.write(
                    f"[GeminiProvider] Model '{model}' unavailable, falling back to '{self.model}'\n"
                )
                self._unavailable_models.add(model)
                # Retry with fallback model
                try:
                    response = await self._generate_structured_with_timeout(
                        self.model, prompt, schema, cfg
                    )
                except asyncio.TimeoutError:
                    raise TimeoutError(f"LLM structured generation timed out after {self._llm_timeout}s")
            else:
                raise
        
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
        
        # Fallback to text parsing with safe JSON parser
        if response.text:
            from ..utils.json_parser import safe_json_loads
            result = safe_json_loads(response.text, expected_type=dict)
            if result:
                return result
        
        raise ValueError("Empty response from Gemini")
