"""
Đọc cấu hình AI (cache dùng chung Redis, tự xóa khi sửa trên màn Cấu hình AI).

    from apps.ai_settings.services import get_setting, get_int, get_float, get_bool
    prompt = get_setting('AI_SYSTEM_PROMPT')
"""
from django.core.cache import cache

from .defaults import DEFAULT_SETTINGS
from .models import AiSetting

CACHE_KEY = 'ai_settings_all'
CACHE_SECONDS = 300


def _all() -> dict:
    data = cache.get(CACHE_KEY)
    if data is None:
        data = dict(AiSetting.objects.filter(is_active=True).values_list('key', 'value'))
        cache.set(CACHE_KEY, data, CACHE_SECONDS)
    return data


def invalidate():
    cache.delete(CACHE_KEY)


def get_setting(key: str, default: str | None = None) -> str:
    """Giá trị đang bật trên UI -> mặc định hệ thống (defaults.py) -> `default`."""
    value = _all().get(key)
    if value is None and key in DEFAULT_SETTINGS:
        value = DEFAULT_SETTINGS[key][1]
    return value if value is not None else (default or '')


def get_float(key: str, default: float) -> float:
    try:
        return float(get_setting(key, str(default)))
    except ValueError:
        return default


def get_int(key: str, default: int) -> int:
    return int(get_float(key, default))


def get_bool(key: str, default: bool = False) -> bool:
    return get_setting(key, 'true' if default else 'false').strip().lower() in ('true', '1', 'yes', 'on')
