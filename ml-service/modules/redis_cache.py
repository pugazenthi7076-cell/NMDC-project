"""
Redis Cache Module
- Caches sensor data for fast dashboard queries
- Session store for user authentication
- Pub/Sub for real-time sensor updates
"""
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class RedisCache:
    """Redis-based caching layer for sensor data and sessions."""

    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self.host = host
        self.port = port
        self.db = db
        self.client = None
        self.connected = False
        self._connect()

    def _connect(self):
        """Connect to Redis server."""
        if not REDIS_AVAILABLE:
            print("[Redis] redis-py not installed. Using in-memory fallback.")
            self._init_memory_fallback()
            return

        try:
            self.client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3
            )
            self.client.ping()
            self.connected = True
            print(f"[Redis] Connected to {self.host}:{self.port}")
        except Exception as e:
            print(f"[Redis] Connection failed: {e}. Using in-memory fallback.")
            self._init_memory_fallback()

    def _init_memory_fallback(self):
        """In-memory dict fallback when Redis is unavailable."""
        self._memory_store = {}
        self._memory_expiry = {}
        self._pubsub_channels = {}
        self.connected = False

    def _cleanup_expired(self):
        """Remove expired keys from memory fallback."""
        now = time.time()
        expired = [k for k, v in self._memory_expiry.items() if v < now]
        for k in expired:
            self._memory_store.pop(k, None)
            self._memory_expiry.pop(k, None)

    # --- Cache Operations ---

    def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Set a value with optional TTL (seconds)."""
        try:
            serialized = json.dumps(value, default=str)
            if self.connected:
                self.client.setex(key, ttl, serialized)
            else:
                self._cleanup_expired()
                self._memory_store[key] = serialized
                self._memory_expiry[key] = time.time() + ttl
            return True
        except Exception as e:
            print(f"[Redis] SET error: {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """Get a cached value."""
        try:
            if self.connected:
                raw = self.client.get(key)
            else:
                self._cleanup_expired()
                raw = self._memory_store.get(key)
            if raw:
                return json.loads(raw)
            return None
        except Exception as e:
            print(f"[Redis] GET error: {e}")
            return None

    def delete(self, key: str) -> bool:
        """Delete a key."""
        try:
            if self.connected:
                self.client.delete(key)
            else:
                self._memory_store.pop(key, None)
                self._memory_expiry.pop(key, None)
            return True
        except Exception as e:
            print(f"[Redis] DEL error: {e}")
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists."""
        try:
            if self.connected:
                return self.client.exists(key) > 0
            else:
                self._cleanup_expired()
                return key in self._memory_store
        except Exception:
            return False

    def increment(self, key: str, amount: int = 1) -> int:
        """Increment a counter."""
        try:
            if self.connected:
                return self.client.incrby(key, amount)
            else:
                current = int(self._memory_store.get(key, "0"))
                new_val = current + amount
                self._memory_store[key] = str(new_val)
                return new_val
        except Exception:
            return 0

    def keys_pattern(self, pattern: str) -> List[str]:
        """Get keys matching pattern."""
        try:
            if self.connected:
                return self.client.keys(pattern)
            else:
                import fnmatch
                self._cleanup_expired()
                return [k for k in self._memory_store.keys() if fnmatch.fnmatch(k, pattern)]
        except Exception:
            return []

    # --- Sensor Data Cache ---

    def cache_sensor_reading(self, belt_id: str, sensor_type: str, data: Dict) -> bool:
        """Cache a sensor reading with automatic TTL."""
        key = f"sensor:{belt_id}:{sensor_type}"
        data["_cached_at"] = datetime.utcnow().isoformat()
        return self.set(key, data, ttl=600)  # 10 min TTL

    def get_sensor_reading(self, belt_id: str, sensor_type: str) -> Optional[Dict]:
        """Get latest cached sensor reading."""
        return self.get(f"sensor:{belt_id}:{sensor_type}")

    def cache_belt_summary(self, belt_id: str, summary: Dict) -> bool:
        """Cache belt health summary."""
        return self.set(f"belt:summary:{belt_id}", summary, ttl=300)

    def get_belt_summary(self, belt_id: str) -> Optional[Dict]:
        """Get cached belt summary."""
        return self.get(f"belt:summary:{belt_id}")

    def cache_dashboard_stats(self, stats: Dict) -> bool:
        """Cache dashboard overview stats."""
        return self.set("dashboard:stats", stats, ttl=120)

    def get_dashboard_stats(self) -> Optional[Dict]:
        """Get cached dashboard stats."""
        return self.get("dashboard:stats")

    def increment_counter(self, name: str) -> int:
        """Increment a named counter (e.g., predictions_today)."""
        key = f"counter:{name}:{datetime.utcnow().strftime('%Y-%m-%d')}"
        return self.increment(key)

    # --- Session Store ---

    def create_session(self, session_id: str, user_data: Dict, ttl: int = 86400) -> bool:
        """Create a user session (24h default TTL)."""
        return self.set(f"session:{session_id}", user_data, ttl=ttl)

    def get_session(self, session_id: str) -> Optional[Dict]:
        """Get user session data."""
        return self.get(f"session:{session_id}")

    def destroy_session(self, session_id: str) -> bool:
        """Destroy a user session."""
        return self.delete(f"session:{session_id}")

    def get_active_sessions(self) -> List[Dict]:
        """Get all active sessions."""
        keys = self.keys_pattern("session:*")
        sessions = []
        for key in keys:
            data = self.get(key)
            if data:
                sessions.append(data)
        return sessions

    # --- Pub/Sub ---

    def publish(self, channel: str, message: Dict) -> bool:
        """Publish a message to a channel."""
        try:
            serialized = json.dumps(message, default=str)
            if self.connected:
                self.client.publish(channel, serialized)
            else:
                if channel not in self._pubsub_channels:
                    self._pubsub_channels[channel] = []
                self._pubsub_channels[channel].append(message)
                # Keep last 100 messages
                if len(self._pubsub_channels[channel]) > 100:
                    self._pubsub_channels[channel] = self._pubsub_channels[channel][-100:]
            return True
        except Exception as e:
            print(f"[Redis] PUBLISH error: {e}")
            return False

    def get_recent_messages(self, channel: str, limit: int = 50) -> List[Dict]:
        """Get recent messages from a channel (memory fallback only)."""
        if self.connected:
            # Redis PubSub doesn't store messages; use a list instead
            key = f"channel:history:{channel}"
            messages = self.get(key) or []
            return messages[-limit:]
        else:
            return self._pubsub_channels.get(channel, [])[-limit:]

    # --- Rate Limiting ---

    def check_rate_limit(self, key: str, max_requests: int = 100, window: int = 60) -> bool:
        """Check if a rate limit has been exceeded."""
        rate_key = f"rate:{key}:{int(time.time() // window)}"
        current = self.increment(rate_key)
        if current == 1 and not self.connected:
            # Set expiry for memory fallback
            self._memory_expiry[rate_key] = time.time() + window
        return current <= max_requests

    # --- Stats ---

    def get_stats(self) -> Dict:
        """Get Redis/cache statistics."""
        if self.connected:
            info = self.client.info()
            return {
                "connected": True,
                "backend": "redis",
                "host": self.host,
                "port": self.port,
                "used_memory": info.get("used_memory_human", "unknown"),
                "connected_clients": info.get("connected_clients", 0),
                "total_commands": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
            }
        else:
            self._cleanup_expired()
            return {
                "connected": False,
                "backend": "in-memory",
                "keys_stored": len(self._memory_store),
                "channels": list(self._pubsub_channels.keys()),
            }


# Global instance
redis_cache = RedisCache()
