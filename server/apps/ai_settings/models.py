import pghistory
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel


class ValueType(models.TextChoices):
    TEXT = 'TEXT', _("Văn bản ngắn")
    PROMPT = 'PROMPT', _("Prompt (văn bản dài)")
    NUMBER = 'NUMBER', _("Số")
    BOOLEAN = 'BOOLEAN', _("Bật / tắt")


@pghistory.track(pghistory.InsertEvent(), pghistory.UpdateEvent(), pghistory.DeleteEvent())
class AiSetting(AuditModel):
    """2.1 Tham số AI dạng khóa / giá trị (bảng AiSettings theo DBML)."""
    key = models.CharField(max_length=100, unique=True, verbose_name=_("Khóa"))
    label = models.CharField(max_length=255, verbose_name=_("Tên hiển thị"))
    value = models.TextField(verbose_name=_("Giá trị"))
    value_type = models.CharField(max_length=20, choices=ValueType.choices, default=ValueType.TEXT, verbose_name=_("Kiểu giá trị"))

    class Meta:
        db_table = "AiSettings"
        verbose_name = _("cấu hình AI")
        verbose_name_plural = _("Danh sách cấu hình AI")
        ordering = ['-updated_at', 'id']
        indexes = [models.Index(fields=['-updated_at', 'id'])]

    def save(self, *args, **kwargs):
        if self.key:
            self.key = self.key.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.key
