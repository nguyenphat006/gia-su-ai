from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class EventType(models.TextChoices):
    LOGIN = 'LOGIN', _("Vào học")
    CHAT = 'CHAT', _("Hỏi gia sư AI")
    QUIZ = 'QUIZ', _("Làm bài ôn tập")
    FLASHCARD_VIEW = 'FLASHCARD_VIEW', _("Xem flashcard")
    MINDMAP_VIEW = 'MINDMAP_VIEW', _("Xem sơ đồ tư duy")
    ARENA = 'ARENA', _("Thi đấu đấu trường")


class LearningEvent(models.Model):
    """
    8.1 Sự kiện học tập (bảng LearningEvents) — bảng nhật ký ghi một lần, nguồn cho heatmap và thống kê học sinh.
    Không xóa mềm, không theo dõi pghistory (theo DBML).
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='learning_events',
                             verbose_name=_("Học sinh"))
    event_type = models.CharField(max_length=30, choices=EventType.choices, verbose_name=_("Loại sự kiện"))
    source_type = models.CharField(max_length=30, null=True, blank=True, verbose_name=_("Loại nguồn"))
    source_id = models.BigIntegerField(null=True, blank=True, verbose_name=_("Id nguồn"))
    metadata = models.JSONField(null=True, blank=True, verbose_name=_("Thông tin phụ"))
    occurred_at = models.DateTimeField(default=timezone.now, verbose_name=_("Thời điểm"))

    class Meta:
        db_table = "LearningEvents"
        verbose_name = _("sự kiện học tập")
        verbose_name_plural = _("Sự kiện học tập")
        ordering = ['-occurred_at', 'id']
        indexes = [
            models.Index(fields=['user', 'occurred_at']),
            models.Index(fields=['event_type', 'occurred_at']),
        ]

    def __str__(self):
        return f"{self.user_id} {self.event_type} {self.occurred_at:%Y-%m-%d %H:%M}"


def record_event(user, event_type: str, *, source=None, metadata: dict | None = None) -> LearningEvent:
    """Ghi 1 sự kiện học tập. `source` = (source_type, source_id)."""
    source_type, source_id = source or (None, None)
    return LearningEvent.objects.create(user=user, event_type=event_type, source_type=source_type,
                                        source_id=source_id, metadata=metadata)
