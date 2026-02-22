import redis.asyncio as redis
from typing import Optional
from ..config.settings import get_settings

class RedisClient:
    _instance: Optional[redis.Redis] = None

    @classmethod
    def get_instance(cls) -> redis.Redis:
        """Get or create the Redis client instance."""
        if cls._instance is None:
            settings = get_settings()
            if not settings.REDIS_URL:
                raise ValueError("REDIS_URL is not set in environment variables")
            
            # The 'rediss://' scheme in the URL ensures SSL/TLS connection
            cls._instance = redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=5.0
            )
        return cls._instance

    @classmethod
    async def close(cls):
        """Close the Redis connection."""
        if cls._instance:
            await cls._instance.close()
            cls._instance = None

def get_redis_client() -> redis.Redis:
    """Helper function to get Redis client."""
    return RedisClient.get_instance()
