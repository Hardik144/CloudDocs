import logging
from typing import Optional, Dict, Any
import redis
from app.core.config import settings

logger = logging.getLogger("clouddocs.redis")

class RedisClient:
    def __init__(self):
        self._client: Optional[redis.Redis] = None
        self._memory_cache: Dict[str, Any] = {}
        self._available = False
        self._connect()

    def _connect(self):
        try:
            self._client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=1.0)
            self._client.ping()
            self._available = True
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            self._available = False
            self._client = None
            logger.warning(f"Redis unavailable ({e}). Using in-memory fallback for transient state.")

    @property
    def is_available(self) -> bool:
        return self._available

    def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        if self._available and self._client:
            try:
                return bool(self._client.set(key, value, ex=ex))
            except Exception:
                pass
        self._memory_cache[key] = value
        return True

    def get(self, key: str) -> Optional[str]:
        if self._available and self._client:
            try:
                return self._client.get(key)
            except Exception:
                pass
        return self._memory_cache.get(key)

    def delete(self, key: str) -> bool:
        if self._available and self._client:
            try:
                return bool(self._client.delete(key))
            except Exception:
                pass
        self._memory_cache.pop(key, None)
        return True

redis_client = RedisClient()
