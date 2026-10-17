from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel


class MatchMode(models.TextChoices):
    PVP = 'PVP', _("Đấu với bạn")
    AI = 'AI', _("Đấu với AI")


class MatchStatus(models.TextChoices):
    IN_PROGRESS = 'IN_PROGRESS', _("Đang đấu")
    FINISHED = 'FINISHED', _("Đã kết thúc")
    ABANDONED = 'ABANDONED', _("Bỏ dở")


class ArenaMatch(AuditModel):
    """
    6.1 Trận đấu (bảng ArenaMatches). `questions` = ảnh chụp đề kèm đáp án — chỉ server đọc,
    client chỉ nhận bản không đáp án.
    """
    mode = models.CharField(max_length=10, choices=MatchMode.choices, verbose_name=_("Chế độ"))
    grade = models.PositiveSmallIntegerField(null=True, blank=True, verbose_name=_("Khối"))
    topic = models.CharField(max_length=255, verbose_name=_("Chủ đề"))
    question_type = models.CharField(max_length=20, default='MULTIPLE_CHOICE', verbose_name=_("Loại câu hỏi"))
    questions = models.JSONField(verbose_name=_("Đề thi"))
    status = models.CharField(max_length=20, choices=MatchStatus.choices, default=MatchStatus.IN_PROGRESS,
                              verbose_name=_("Trạng thái"))
    started_at = models.DateTimeField(default=timezone.now, verbose_name=_("Bắt đầu"))
    ended_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Kết thúc"))
    ai_analysis = models.JSONField(null=True, blank=True, verbose_name=_("Nhận xét AI"))

    class Meta:
        db_table = "ArenaMatches"
        verbose_name = _("trận đấu")
        verbose_name_plural = _("Lịch sử trận đấu")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['mode', 'created_at'])]

    def __str__(self):
        return f"#{self.id} {self.mode} {self.topic}"


class ArenaParticipant(models.Model):
    """6.2 Người chơi trong trận (bảng ArenaParticipants) — 2 dòng / trận; đối thủ AI có user NULL."""
    match = models.ForeignKey(ArenaMatch, on_delete=models.CASCADE, related_name='participants',
                              verbose_name=_("Trận đấu"))
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True,
                             related_name='arena_participations', verbose_name=_("Người chơi"))
    score = models.IntegerField(default=0, verbose_name=_("Điểm"))
    correct_count = models.PositiveIntegerField(default=0, verbose_name=_("Số câu đúng"))
    is_winner = models.BooleanField(default=False, verbose_name=_("Thắng"))
    xp_earned = models.IntegerField(default=0, verbose_name=_("XP nhận được"))
    answers = models.JSONField(default=list, verbose_name=_("Bài làm"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Thời điểm tạo"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Thời điểm cập nhật gần nhất"))

    class Meta:
        db_table = "ArenaParticipants"
        verbose_name = _("người chơi")
        verbose_name_plural = _("Người chơi")
        ordering = ['id']
        constraints = [models.UniqueConstraint(fields=['match', 'user'], name='uniq_match_user')]
        indexes = [models.Index(fields=['user', 'created_at'])]

    def __str__(self):
        return f"{self.match_id}:{self.user_id or 'AI'} {self.score}"
