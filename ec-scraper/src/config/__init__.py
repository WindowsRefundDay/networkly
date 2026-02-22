"""Configuration module."""

from .settings import (
    Settings,
    get_settings,
    DiscoveryProfile,
    get_discovery_profile,
    QUICK_PROFILE,
    DAILY_PROFILE,
)
from .blocklists import (
    BLOCKED_DOMAINS,
    JS_HEAVY_DOMAINS,
    SLOW_RENDER_DOMAINS,
    is_blocked_domain,
    is_js_heavy_domain,
    is_slow_render_domain,
    get_domain,
)

__all__ = [
    "Settings",
    "get_settings",
    "DiscoveryProfile",
    "get_discovery_profile",
    "QUICK_PROFILE",
    "DAILY_PROFILE",
    "BLOCKED_DOMAINS",
    "JS_HEAVY_DOMAINS",
    "SLOW_RENDER_DOMAINS",
    "is_blocked_domain",
    "is_js_heavy_domain",
    "is_slow_render_domain",
    "get_domain",
]
