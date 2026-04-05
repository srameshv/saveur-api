"""
Simple in-memory per-user rate limiter.
Works for single-process deployments (Railway single instance).
"""
import threading
from collections import defaultdict
from datetime import datetime, timezone


class InMemoryRateLimiter:
    def __init__(self):
        self._counts: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self, key: str, max_calls: int, window_seconds: int) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        cutoff = now - window_seconds
        with self._lock:
            self._counts[key] = [t for t in self._counts[key] if t > cutoff]
            if len(self._counts[key]) >= max_calls:
                return False
            self._counts[key].append(now)
            return True

    def remaining(self, key: str, max_calls: int, window_seconds: int) -> int:
        now = datetime.now(timezone.utc).timestamp()
        cutoff = now - window_seconds
        with self._lock:
            recent = [t for t in self._counts[key] if t > cutoff]
            return max(0, max_calls - len(recent))


user_limiter = InMemoryRateLimiter()

# Limits
AI_RECS_PER_DAY = 20
PLACES_SEARCH_PER_DAY = 50
FEEDBACK_PER_DAY = 5
MAX_GROUPS_PER_USER = 10
MAX_RESTAURANTS_PER_SESSION = 30
