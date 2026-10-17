import pghistory
from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel


class XpAction(models.TextChoices):
    CHAT_AI = 'CHAT_AI', _("Hỏi gia sư AI")
    COMPLETE_QUIZ = 'COMPLETE_QUIZ', _("Hoàn thành bài ôn tập")
    ARENA = 'ARENA', _("Thi đấu đấu trường")
    DAILY_LOGIN = 'DAILY_LOGIN', _("Điểm danh hằng ngày")
    ADMIN_BONUS = 'ADMIN_BONUS', _("Giáo viên thưởng")
    QUEST_COMPLETED = 'QUEST_COMPLETED', _("Hoàn thành thử thách")
    GUARD_PENALTY = 'GUARD_PENALTY', _("Vi phạm nội dung")


class TriggerAction(models.TextChoices):
    CHAT_AI = 'CHAT_AI', _("Hỏi gia sư AI")
    COMPLETE_QUIZ = 'COMPLETE_QUIZ', _("Hoàn thành bài ôn tập")
    FLASHCARD_QUIZ = 'FLASHCARD_QUIZ', _("Kiểm tra flashcard")
    ARENA = 'ARENA', _("Thi đấu đấu trường")


class Period(models.TextChoices):
    DAILY = 'DAILY', _("Hằng ngày")
    WEEKLY = 'WEEKLY', _("Hằng tuần")
    ONCE = 'ONCE', _("Một lần")


class UserStats(models.Model):
    """7.1 Thống kê tích lũy (bảng UserStats) — 1 dòng / học sinh, cập nhật liên tục (không theo dõi pghistory)."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stats',
                                verbose_name=_("Học sinh"))
    total_xp = models.PositiveIntegerField(default=0, verbose_name=_("Tổng XP"))
    weekly_xp = models.PositiveIntegerField(default=0, verbose_name=_("XP tuần này"))
    points = models.PositiveIntegerField(default=0, verbose_name=_("Điểm thưởng"))
    current_streak = models.PositiveIntegerField(default=0, verbose_name=_("Chuỗi ngày học"))
    longest_streak = models.PositiveIntegerField(default=0, verbose_name=_("Chuỗi dài nhất"))
    last_study_date = models.DateField(null=True, blank=True, verbose_name=_("Ngày học gần nhất"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Thời điểm cập nhật gần nhất"))

    class Meta:
        db_table = "UserStats"
        verbose_name = _("thống kê học tập")
        verbose_name_plural = _("Thống kê học tập")
        ordering = ['-total_xp', 'id']
        indexes = [models.Index(fields=['-weekly_xp']), models.Index(fields=['-total_xp'])]

    def __str__(self):
        return f"{self.user_id}: {self.total_xp} XP"


class XpLog(models.Model):
    """7.2 Sổ cái XP (bảng XpLogs) — ghi một lần."""
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_logs',
                             verbose_name=_("Học sinh"))
    amount = models.IntegerField(verbose_name=_("Số XP"))
    action = models.CharField(max_length=30, choices=XpAction.choices, verbose_name=_("Hành động"))
    source_type = models.CharField(max_length=30, null=True, blank=True, verbose_name=_("Loại nguồn"))
    source_id = models.BigIntegerField(null=True, blank=True, verbose_name=_("Id nguồn"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Thời điểm"))

    class Meta:
        db_table = "XpLogs"
        verbose_name = _("nhật ký XP")
        verbose_name_plural = _("Nhật ký XP")
        ordering = ['-created_at', 'id']
        indexes = [models.Index(fields=['user', 'created_at']), models.Index(fields=['action', 'created_at'])]

    def __str__(self):
        return f"{self.user_id} {self.amount:+d} {self.action}"


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class Challenge(AuditModel):
    """7.3 Danh mục thử thách (bảng Challenges)."""
    code = models.CharField(max_length=50, unique=True, verbose_name=_("Mã thử thách"))
    name = models.CharField(max_length=255, verbose_name=_("Tên thử thách"))
    trigger_action = models.CharField(max_length=30, choices=TriggerAction.choices, verbose_name=_("Hành động tính tiến độ"))
    goal = models.PositiveIntegerField(default=1, verbose_name=_("Mục tiêu"))
    period = models.CharField(max_length=10, choices=Period.choices, default=Period.DAILY, verbose_name=_("Chu kỳ"))
    xp_reward = models.PositiveIntegerField(default=0, verbose_name=_("XP thưởng"))
    points_reward = models.PositiveIntegerField(default=0, verbose_name=_("Điểm thưởng"))

    class Meta:
        db_table = "Challenges"
        verbose_name = _("thử thách")
        verbose_name_plural = _("Danh mục thử thách")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id'])]

    def __str__(self):
        return self.name


class UserChallenge(models.Model):
    """7.4 Tiến độ thử thách theo kỳ (bảng UserChallenges) — kỳ mới = dòng mới, không cần job reset."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='challenge_progress',
                             verbose_name=_("Học sinh"))
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='progress',
                                  verbose_name=_("Thử thách"))
    period_key = models.CharField(max_length=20, verbose_name=_("Kỳ"))
    progress = models.PositiveIntegerField(default=0, verbose_name=_("Tiến độ"))
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Thời điểm hoàn thành"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Thời điểm tạo"))
    updated_at = models.DateTimeField(auto_now=True, verbose_name=_("Thời điểm cập nhật gần nhất"))

    class Meta:
        db_table = "UserChallenges"
        verbose_name = _("tiến độ thử thách")
        verbose_name_plural = _("Tiến độ thử thách")
        ordering = ['-updated_at', 'id']
        constraints = [
            models.UniqueConstraint(fields=['user', 'challenge', 'period_key'], name='uniq_user_challenge_period'),
        ]

    def __str__(self):
        return f"{self.user_id} {self.challenge_id} {self.period_key}: {self.progress}"


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class LevelTier(AuditModel):
    """7.5 Bậc danh hiệu theo XP (bảng LevelTiers)."""
    title = models.CharField(max_length=100, verbose_name=_("Danh hiệu"))
    min_xp = models.PositiveIntegerField(unique=True, verbose_name=_("XP tối thiểu"))
    sort_order = models.PositiveIntegerField(default=0, verbose_name=_("Thứ tự"))

    class Meta:
        db_table = "LevelTiers"
        verbose_name = _("bậc danh hiệu")
        verbose_name_plural = _("Bậc danh hiệu")
        ordering = ['min_xp']
        indexes = [models.Index(fields=['-updated_at', 'id'])]

    def __str__(self):
        return f"{self.title} (≥{self.min_xp} XP)"
