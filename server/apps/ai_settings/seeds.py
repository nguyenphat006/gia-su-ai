"""Tạo cấu hình AI mặc định còn thiếu (không ghi đè giá trị đã chỉnh trên UI). seed_core tự gọi."""
from .defaults import DEFAULT_SETTINGS
from .models import AiSetting
from .services import invalidate


def seed() -> str:
    created = 0
    for key, (label, value, value_type, description) in DEFAULT_SETTINGS.items():
        _obj, is_new = AiSetting.all_objects.get_or_create(
            key=key, defaults={'label': label, 'value': value, 'value_type': value_type, 'description': description},
        )
        created += int(is_new)
    invalidate()
    return f"tao moi {created}/{len(DEFAULT_SETTINGS)} cau hinh AI"
