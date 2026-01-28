"""Tests for retry utilities."""

import asyncio
import pytest
from unittest.mock import AsyncMock, patch
from src.utils.retry import (
    RetryConfig,
    calculate_delay,
    retry_async,
    with_retry,
    SEARCH_RETRY_CONFIG,
    CRAWL_RETRY_CONFIG,
    EMBEDDING_RETRY_CONFIG,
    LLM_RETRY_CONFIG,
)


class TestRetryConfig:
    """Tests for RetryConfig dataclass."""

    def test_default_config(self):
        """Test default configuration values."""
        config = RetryConfig()
        assert config.max_retries == 3
        assert config.base_delay == 1.0
        assert config.max_delay == 30.0
        assert config.exponential_base == 2.0
        assert config.log_retries is True

    def test_custom_config(self):
        """Test custom configuration values."""
        config = RetryConfig(
            max_retries=5,
            base_delay=2.0,
            max_delay=60.0,
            exponential_base=3.0,
            log_retries=False,
        )
        assert config.max_retries == 5
        assert config.base_delay == 2.0
        assert config.max_delay == 60.0
        assert config.exponential_base == 3.0
        assert config.log_retries is False

    def test_retryable_status_codes(self):
        """Test default retryable status codes."""
        config = RetryConfig()
        assert 429 in config.retryable_status_codes
        assert 500 in config.retryable_status_codes
        assert 502 in config.retryable_status_codes
        assert 503 in config.retryable_status_codes
        assert 504 in config.retryable_status_codes


class TestPresetConfigs:
    """Tests for preset retry configurations."""

    def test_search_config(self):
        """Test search retry configuration."""
        assert SEARCH_RETRY_CONFIG.max_retries == 3
        assert SEARCH_RETRY_CONFIG.base_delay == 1.5
        assert SEARCH_RETRY_CONFIG.max_delay == 15.0

    def test_crawl_config(self):
        """Test crawl retry configuration."""
        assert CRAWL_RETRY_CONFIG.max_retries == 2
        assert CRAWL_RETRY_CONFIG.base_delay == 0.5
        assert CRAWL_RETRY_CONFIG.max_delay == 5.0

    def test_embedding_config(self):
        """Test embedding retry configuration."""
        assert EMBEDDING_RETRY_CONFIG.max_retries == 3
        assert EMBEDDING_RETRY_CONFIG.base_delay == 2.0
        assert 529 in EMBEDDING_RETRY_CONFIG.retryable_status_codes

    def test_llm_config(self):
        """Test LLM retry configuration."""
        assert LLM_RETRY_CONFIG.max_retries == 3
        assert LLM_RETRY_CONFIG.max_delay == 60.0
        assert 529 in LLM_RETRY_CONFIG.retryable_status_codes


class TestCalculateDelay:
    """Tests for delay calculation."""

    def test_first_attempt_delay(self):
        """Test delay for first retry attempt."""
        config = RetryConfig(base_delay=1.0, exponential_base=2.0)
        delay = calculate_delay(0, config)
        assert delay == 1.0  # 1.0 * 2^0 = 1.0

    def test_second_attempt_delay(self):
        """Test delay for second retry attempt."""
        config = RetryConfig(base_delay=1.0, exponential_base=2.0)
        delay = calculate_delay(1, config)
        assert delay == 2.0  # 1.0 * 2^1 = 2.0

    def test_third_attempt_delay(self):
        """Test delay for third retry attempt."""
        config = RetryConfig(base_delay=1.0, exponential_base=2.0)
        delay = calculate_delay(2, config)
        assert delay == 4.0  # 1.0 * 2^2 = 4.0

    def test_max_delay_capping(self):
        """Test that delay is capped at max_delay."""
        config = RetryConfig(base_delay=1.0, max_delay=5.0, exponential_base=2.0)
        delay = calculate_delay(10, config)  # Would be 1024 without cap
        assert delay == 5.0

    def test_custom_exponential_base(self):
        """Test delay with custom exponential base."""
        config = RetryConfig(base_delay=1.0, exponential_base=3.0, max_delay=100.0)
        delay = calculate_delay(2, config)
        assert delay == 9.0  # 1.0 * 3^2 = 9.0

    def test_custom_base_delay(self):
        """Test delay with custom base delay."""
        config = RetryConfig(base_delay=2.0, exponential_base=2.0, max_delay=100.0)
        delay = calculate_delay(1, config)
        assert delay == 4.0  # 2.0 * 2^1 = 4.0


class TestRetryAsync:
    """Tests for async retry function."""

    @pytest.mark.asyncio
    async def test_success_on_first_try(self):
        """Test that successful function returns immediately."""
        mock_func = AsyncMock(return_value="success")
        config = RetryConfig(max_retries=3, log_retries=False)

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"
        assert mock_func.call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_failure(self):
        """Test that function is retried on failure."""
        mock_func = AsyncMock(side_effect=[ConnectionError(), "success"])
        config = RetryConfig(max_retries=3, base_delay=0.01, log_retries=False)

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"
        assert mock_func.call_count == 2

    @pytest.mark.asyncio
    async def test_exhausts_retries(self):
        """Test that exception is raised after all retries exhausted."""
        mock_func = AsyncMock(side_effect=ConnectionError("Network error"))
        config = RetryConfig(max_retries=2, base_delay=0.01, log_retries=False)

        with pytest.raises(ConnectionError):
            await retry_async(
                mock_func,
                config=config,
                operation_name="test",
            )

        assert mock_func.call_count == 3  # Initial + 2 retries

    @pytest.mark.asyncio
    async def test_non_retryable_exception(self):
        """Test that non-retryable exceptions are raised immediately."""
        mock_func = AsyncMock(side_effect=ValueError("Invalid input"))
        config = RetryConfig(max_retries=3, base_delay=0.01, log_retries=False)

        with pytest.raises(ValueError):
            await retry_async(
                mock_func,
                config=config,
                operation_name="test",
            )

        assert mock_func.call_count == 1  # No retries

    @pytest.mark.asyncio
    async def test_retries_timeout_error(self):
        """Test that TimeoutError is retried."""
        mock_func = AsyncMock(side_effect=[TimeoutError(), "success"])
        config = RetryConfig(max_retries=3, base_delay=0.01, log_retries=False)

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"

    @pytest.mark.asyncio
    async def test_retries_asyncio_timeout(self):
        """Test that asyncio.TimeoutError is retried."""
        mock_func = AsyncMock(side_effect=[asyncio.TimeoutError(), "success"])
        config = RetryConfig(max_retries=3, base_delay=0.01, log_retries=False)

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"

    @pytest.mark.asyncio
    async def test_passes_args_and_kwargs(self):
        """Test that args and kwargs are passed to function."""
        mock_func = AsyncMock(return_value="success")
        config = RetryConfig(max_retries=1, log_retries=False)

        await retry_async(
            mock_func,
            "arg1",
            "arg2",
            config=config,
            operation_name="test",
            kwarg1="value1",
        )

        mock_func.assert_called_once_with("arg1", "arg2", kwarg1="value1")

    @pytest.mark.asyncio
    async def test_default_config_used(self):
        """Test that default config is used when none provided."""
        mock_func = AsyncMock(return_value="success")

        result = await retry_async(
            mock_func,
            operation_name="test",
        )

        assert result == "success"


class TestWithRetryDecorator:
    """Tests for the @with_retry decorator."""

    @pytest.mark.asyncio
    async def test_decorator_wraps_function(self):
        """Test that decorator wraps function correctly."""
        config = RetryConfig(max_retries=1, base_delay=0.01, log_retries=False)

        @with_retry(config=config)
        async def my_func():
            return "decorated"

        result = await my_func()
        assert result == "decorated"

    @pytest.mark.asyncio
    async def test_decorator_retries_on_failure(self):
        """Test that decorated function is retried on failure."""
        config = RetryConfig(max_retries=2, base_delay=0.01, log_retries=False)
        call_count = 0

        @with_retry(config=config)
        async def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count < 2:
                raise ConnectionError()
            return "success"

        result = await flaky_func()
        assert result == "success"
        assert call_count == 2

    @pytest.mark.asyncio
    async def test_decorator_uses_function_name(self):
        """Test that decorator uses function name for logging."""
        config = RetryConfig(max_retries=1, log_retries=False)

        @with_retry(config=config, operation_name="custom_name")
        async def my_named_func():
            return "named"

        # Function should still work
        result = await my_named_func()
        assert result == "named"

    @pytest.mark.asyncio
    async def test_decorator_preserves_function_metadata(self):
        """Test that decorator preserves function name and docstring."""
        config = RetryConfig(max_retries=1, log_retries=False)

        @with_retry(config=config)
        async def documented_func():
            """This is a docstring."""
            return "doc"

        assert documented_func.__name__ == "documented_func"
        assert documented_func.__doc__ == "This is a docstring."


class TestRetryExceptionTypes:
    """Tests for exception type handling."""

    @pytest.mark.asyncio
    async def test_custom_retryable_exceptions(self):
        """Test with custom retryable exception types."""
        class CustomError(Exception):
            pass

        config = RetryConfig(
            max_retries=2,
            base_delay=0.01,
            retryable_exceptions=(CustomError,),
            log_retries=False,
        )
        mock_func = AsyncMock(side_effect=[CustomError(), "success"])

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"

    @pytest.mark.asyncio
    async def test_subclass_exceptions_retried(self):
        """Test that subclass exceptions are retried."""
        class CustomConnectionError(ConnectionError):
            pass

        config = RetryConfig(max_retries=2, base_delay=0.01, log_retries=False)
        mock_func = AsyncMock(side_effect=[CustomConnectionError(), "success"])

        result = await retry_async(
            mock_func,
            config=config,
            operation_name="test",
        )

        assert result == "success"
