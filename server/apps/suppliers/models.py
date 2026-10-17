import pghistory
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel


@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class Supplier(AuditModel):
    """
    Nhà cung cấp (bảng Suppliers theo DBML).
    Danh mục tham chiếu cho NVL / hóa chất — không quản lý mua hàng, công nợ.
    """
    supplier_code = models.CharField(max_length=50, unique=True, verbose_name=_("Mã nhà cung cấp"))
    supplier_name = models.CharField(max_length=255, verbose_name=_("Tên nhà cung cấp"))
    tax_code = models.CharField(max_length=50, null=True, blank=True, verbose_name=_("Mã số thuế"))
    phone = models.CharField(max_length=50, null=True, blank=True, verbose_name=_("Số điện thoại"))
    email = models.EmailField(max_length=255, null=True, blank=True, verbose_name=_("Email"))
    address = models.CharField(max_length=500, null=True, blank=True, verbose_name=_("Địa chỉ"))

    class Meta:
        db_table = "Suppliers"
        verbose_name = _("nhà cung cấp")
        verbose_name_plural = _("Danh mục nhà cung cấp")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['supplier_code']),
        ]

    def save(self, *args, **kwargs):
        if self.supplier_code:
            self.supplier_code = self.supplier_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.supplier_name} ({self.supplier_code})"
