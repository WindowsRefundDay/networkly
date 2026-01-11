"""Abstract LLM Provider interface."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Optional, Type

from pydantic import BaseModel


@dataclass
class GenerationConfig:
    """Configuration for LLM generation."""
    
    temperature: float = 0.5
    max_output_tokens: int = 2000
    use_fast_model: bool = False  # Use faster/cheaper model for simpler tasks


class LLMProvider(ABC):
    """Abstract base class for LLM providers.
    
    Provides a unified interface for both Gemini and Groq APIs.
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name for logging."""
        pass
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        config: Optional[GenerationConfig] = None,
    ) -> str:
        """Generate text response from prompt.
        
        Args:
            prompt: The prompt text
            config: Generation configuration
            
        Returns:
            Generated text response
        """
        pass
    
    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        config: Optional[GenerationConfig] = None,
    ) -> Any:
        """Generate structured response matching a Pydantic schema.
        
        Args:
            prompt: The prompt text
            schema: Pydantic model class for the expected response
            config: Generation configuration
            
        Returns:
            Parsed response as dict (matching schema structure)
        """
        pass
