"""Retry utilities with exponential backoff for external API calls."""

import asyncio
import functools
import sys
from dataclasses import dataclass, field
from typing import Callable, Optional, Tuple, Type, TypeVar, Any

import aiohttp

T = TypeVar("T")


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""
    
    max_retries: int = 3
    base_delay: float = 1.0  # seconds
    max_delay: float = 30.0  # seconds
    exponential_base: float = 2.0
    # Exception types to retry on (default: common transient errors)
    retryable_exceptions: Tuple[Type[Exception], ...] = field(
        default_factory=lambda: (
            ConnectionError,
            TimeoutError,
            asyncio.TimeoutError,
            aiohttp.ClientError,  # Includes 429/5xx when raised as ClientError
        )
    )
    # HTTP status codes to retry on (for aiohttp responses)
    retryable_status_codes: Tuple[int, ...] = (429, 500, 502, 503, 504)
    # Whether to log retry attempts
    log_retries: bool = True


# Default configs for different use cases
SEARCH_RETRY_CONFIG = RetryConfig(
    max_retries=3,
    base_delay=1.5,  # Slightly longer for rate limit backoff
    max_delay=15.0,
    retryable_exceptions=(
        ConnectionError,
        TimeoutError,
        asyncio.TimeoutError,
        aiohttp.ClientError,
    ),
)

CRAWL_RETRY_CONFIG = RetryConfig(
    max_retries=2,
    base_delay=0.5,
    max_delay=5.0,
    retryable_exceptions=(
        ConnectionError,
        TimeoutError,
        asyncio.TimeoutError,
        aiohttp.ClientError,
    ),
)

EMBEDDING_RETRY_CONFIG = RetryConfig(
    max_retries=3,
    base_delay=2.0,
    max_delay=30.0,
    retryable_status_codes=(429, 500, 502, 503, 504, 529),  # Include 529 for rate limits
)

LLM_RETRY_CONFIG = RetryConfig(
    max_retries=3,
    base_delay=2.0,
    max_delay=60.0,
    retryable_status_codes=(429, 500, 502, 503, 504, 529),
)


def calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for a retry attempt using exponential backoff."""
    delay = config.base_delay * (config.exponential_base ** attempt)
    return min(delay, config.max_delay)


async def retry_async(
    func: Callable[..., T],
    *args,
    config: Optional[RetryConfig] = None,
    operation_name: str = "operation",
    **kwargs,
) -> T:
    """
    Retry an async function with exponential backoff.
    
    Args:
        func: Async function to call
        *args: Positional arguments for the function
        config: Retry configuration (defaults to 3 retries)
        operation_name: Name for logging purposes
        **kwargs: Keyword arguments for the function
        
    Returns:
        Result of the function call
        
    Raises:
        The last exception if all retries are exhausted
    """
    if config is None:
        config = RetryConfig()
    
    last_exception: Optional[Exception] = None
    
    for attempt in range(config.max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except config.retryable_exceptions as e:
            last_exception = e
            
            if attempt < config.max_retries:
                delay = calculate_delay(attempt, config)
                if config.log_retries:
                    sys.stderr.write(
                        f"[Retry] {operation_name} failed (attempt {attempt + 1}/{config.max_retries + 1}): "
                        f"{type(e).__name__}: {str(e)[:100]}. Retrying in {delay:.1f}s\n"
                    )
                await asyncio.sleep(delay)
            else:
                if config.log_retries:
                    sys.stderr.write(
                        f"[Retry] {operation_name} exhausted all {config.max_retries + 1} attempts\n"
                    )
                raise
        except Exception as e:
            # Non-retryable exception, raise immediately
            raise
    
    # Should not reach here, but just in case
    if last_exception:
        raise last_exception
    raise RuntimeError(f"{operation_name} failed with no exception captured")


def with_retry(
    config: Optional[RetryConfig] = None,
    operation_name: Optional[str] = None,
):
    """
    Decorator to add retry behavior to an async function.
    
    Args:
        config: Retry configuration
        operation_name: Name for logging (defaults to function name)
        
    Returns:
        Decorated function with retry behavior
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            name = operation_name or func.__name__
            return await retry_async(
                func, *args,
                config=config or RetryConfig(),
                operation_name=name,
                **kwargs,
            )
        return wrapper
    return decorator
