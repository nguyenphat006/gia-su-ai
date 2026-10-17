"""Tác vụ định kỳ (Celery beat — lịch ở settings.CELERY_BEAT_SCHEDULE)."""
from celery import shared_task

from .services import reset_weekly_xp


@shared_task
def reset_weekly_xp_task():
    """00:00 thứ Hai (giờ Việt Nam): đưa XP tuần về 0 cho bảng xếp hạng tuần mới."""
    return reset_weekly_xp()
