from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel


class ChatRole(models.TextChoices):
    USER = 'USER', _("Học sinh")
    MODEL = 'MODEL', _("Gia sư AI")
    SYSTEM = 'SYSTEM', _("Hệ thống")


class ChatSession(AuditModel):
    """5.1 Phiên trò chuyện với gia sư AI (bảng ChatSessions). Học sinh xóa phiên = xóa mềm."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='chat_sessions',
                             verbose_name=_("Học sinh"))
    title = models.CharField(max_length=255, verbose_name=_("Tiêu đề"))
    last_message_at = models.DateTimeField(null=True, blank=True, verbose_name=_("Tin nhắn gần nhất"))

    class Meta:
        db_table = "ChatSessions"
        verbose_name = _("phiên trò chuyện")
        verbose_name_plural = _("Phiên trò chuyện")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id']), models.Index(fields=['user', 'last_message_at'])]

    def __str__(self):
        return self.title


class ChatMessage(models.Model):
    """5.2 Tin nhắn (bảng ChatMessages) — ghi một lần. Ảnh đính kèm: Attachments (entity_type CHAT_MESSAGE)."""
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages',
                                verbose_name=_("Phiên"))
    role = models.CharField(max_length=10, choices=ChatRole.choices, verbose_name=_("Vai trò"))
    content = models.TextField(verbose_name=_("Nội dung"))
    is_blocked = models.BooleanField(default=False, verbose_name=_("Bị chặn"))
    block_reason = models.CharField(max_length=500, null=True, blank=True, verbose_name=_("Lý do chặn"))
    context_chunk_ids = models.JSONField(null=True, blank=True, verbose_name=_("Đoạn tri thức đã dùng"))
    created_at = models.DateTimeField(auto_now_add=True, verbose_name=_("Thời điểm"))

    class Meta:
        db_table = "ChatMessages"
        verbose_name = _("tin nhắn")
        verbose_name_plural = _("Tin nhắn")
        ordering = ['created_at', 'id']
        indexes = [models.Index(fields=['session', 'created_at'])]

    def __str__(self):
        return f"{self.role}: {self.content[:60]}"
