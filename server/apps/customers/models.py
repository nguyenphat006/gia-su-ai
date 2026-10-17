import pghistory
from django.core.validators import RegexValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.core.models import AuditModel

# Mã khách hàng nằm trong SKU biến thể (MALOAI-MAKH-XXXX-A) → chỉ chữ in hoa, số, "_"; không có "-" (dấu phân cách SKU)
CUSTOMER_CODE_VALIDATOR = RegexValidator(
    r'^[A-Z0-9_]+$', _("Mã khách hàng chỉ gồm chữ in hoa không dấu, số và dấu gạch dưới (dùng trong SKU).")
)


@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class Customer(AuditModel):
    """
    Khách hàng / đối tác đặt sản xuất (bảng Customers theo DBML).
    `customer_code` (MAKH) là một phần của SKU biến thể: 1-IKEA-0001-A.
    """
    customer_code = models.CharField(max_length=50, unique=True, validators=[CUSTOMER_CODE_VALIDATOR], verbose_name=_("Mã khách hàng"))
    customer_name = models.CharField(max_length=255, verbose_name=_("Tên khách hàng"))
    country = models.CharField(max_length=100, null=True, blank=True, verbose_name=_("Quốc gia / Thị trường"))  # mã ISO 3166-1 alpha-2 (apps/core/countries.py)
    logo_url = models.CharField(max_length=500, null=True, blank=True, verbose_name=_("Logo"))

    class Meta:
        db_table = "Customers"
        verbose_name = _("khách hàng")
        verbose_name_plural = _("Danh mục khách hàng")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['customer_code']),
        ]

    def save(self, *args, **kwargs):
        if self.customer_code:
            self.customer_code = self.customer_code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customer_name} ({self.customer_code})"
