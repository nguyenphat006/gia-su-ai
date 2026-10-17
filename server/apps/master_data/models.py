import pghistory
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import AuditModel

@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class UnitOfMeasure(AuditModel):
    """
    1.1 Đơn vị tính (ĐVT) - Bảng UnitsOfMeasure theo database.dbml.
    Ví dụ: PCS (Cái), SET (Bộ), PACK (Gói/Hộp), M3 (Mét khối), M2 (Mét vuông), KG (Kilogram), LITER (Lít)...
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name=_("Mã ĐVT")
    )
    name = models.CharField(
        max_length=100,
        verbose_name=_("Tên ĐVT")
    )

    class Meta:
        db_table = "UnitsOfMeasure"
        verbose_name = _("Đơn vị tính")
        verbose_name_plural = _("Danh mục Đơn vị tính (UOM)")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['code']),
        ]

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.upper().strip()
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class MaterialCategory(AuditModel):
    """
    2.1 Nhóm phân loại Nguyên Vật Liệu (Bảng MaterialCategories theo database.dbml).
    Ví dụ: WOOD (Gỗ xẻ sấy), METAL (Kim loại hộp/ống), CHEMICAL_PAINT (Hóa chất sơn),
    WEAVING (Dây đan), FABRIC_FOAM (Vải nệm), HARDWARE (Phụ kiện), PACKAGING (Bao bì)...
    """
    code = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Mã nhóm NVL")
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Tên nhóm NVL")
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        verbose_name=_("Nhóm cha")
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name=_("Thứ tự hiển thị")
    )

    class Meta:
        db_table = "MaterialCategories"
        verbose_name = _("Nhóm nguyên vật liệu")
        verbose_name_plural = _("Danh mục Nhóm nguyên vật liệu")
        ordering = ['sort_order', '-updated_at', 'id']
        indexes = [
            models.Index(fields=['sort_order', '-updated_at', 'id']),
            models.Index(fields=['code']),
            models.Index(fields=['parent', 'sort_order']),
        ]

    def save(self, *args, **kwargs):
        if self.code:
            self.code = self.code.upper().strip()
        if self.name:
            self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


class ProfileShape(models.TextChoices):
    """
    Hình dạng mặt cắt ngang của phôi kim loại (nhôm, sắt, inox) theo Sổ tay Profile công ty.
    """
    ROUND_PIPE = 'ROUND_PIPE', _('Ống tròn rỗng (P)')
    SOLID_ROUND = 'SOLID_ROUND', _('Tròn đặc (D)')
    SQUARE_TUBE = 'SQUARE_TUBE', _('Hộp vuông rỗng (V)')
    SOLID_SQUARE = 'SOLID_SQUARE', _('Vuông đặc (V...D)')
    RECT_TUBE = 'RECT_TUBE', _('Hộp chữ nhật rỗng (CN)')
    OVAL_PIPE = 'OVAL_PIPE', _('Oval / Elip rỗng (ELIP)')
    FLAT_BAR = 'FLAT_BAR', _('La / Dẹt đặc (L)')
    ANGLE_V = 'ANGLE_V', _('Thép V / Nhôm V')
    SHEET = 'SHEET', _('Nhôm / Sắt tấm (T)')
    SPECIAL_MOLD = 'SPECIAL_MOLD', _('Khuôn định hình đặc biệt (SP)')


@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class Material(AuditModel):
    """
    2.2 Danh mục Nguyên Vật Liệu & Phụ kiện mua ngoài (Bảng Materials theo database.dbml).
    Ví dụ: Ống nhôm tròn Phi 25x1.5, Hộp sắt 20x40x1.2, Gỗ Teak sấy 25mm, Sơn bóng PU, Ốc lục giác M6x30...
    """
    material_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        verbose_name=_("Mã NVL")
    )
    material_name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name=_("Tên NVL")
    )
    category = models.ForeignKey(
        MaterialCategory,
        on_delete=models.PROTECT,
        related_name='materials',
        verbose_name=_("Nhóm NVL")
    )
    base_uom = models.ForeignKey(
        UnitOfMeasure,
        on_delete=models.PROTECT,
        related_name='materials',
        verbose_name=_("ĐVT lưu kho")
    )
    image_url = models.CharField(
        max_length=500,
        blank=True,
        default='',
        verbose_name=_("Đường dẫn ảnh đại diện / bản vẽ mặt cắt")
    )

    class Meta:
        db_table = "Materials"
        verbose_name = _("Nguyên vật liệu")
        verbose_name_plural = _("Danh mục Nguyên vật liệu")
        ordering = ['-updated_at', 'id']
        indexes = [
            models.Index(fields=['-updated_at', 'id']),
            models.Index(fields=['category', 'material_code']),
            models.Index(fields=['material_code']),
            models.Index(fields=['material_name']),
        ]

    def save(self, *args, **kwargs):
        if self.material_code:
            self.material_code = self.material_code.upper().strip()
        if self.material_name:
            self.material_name = self.material_name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.material_name} ({self.material_code})"


@pghistory.track(
    pghistory.InsertEvent(),
    pghistory.UpdateEvent(),
    pghistory.DeleteEvent(),
)
class MetalMaterialSpec(AuditModel):
    """
    2.2.1 Quy cách Kỹ thuật Tiết diện Phôi Kim Loại (Bảng MetalMaterialSpecs - Quan hệ 1-1 với Materials).
    Lưu trữ kích thước mặt cắt hình học, chiều dài tiêu chuẩn, định lượng kg/m và thông tin khuôn.
    """
    material = models.OneToOneField(
        Material,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='metal_spec',
        verbose_name=_("Vật tư kim loại")
    )
    profile_shape = models.CharField(
        max_length=50,
        choices=ProfileShape.choices,
        default=ProfileShape.RECT_TUBE,
        verbose_name=_("Hình dạng mặt cắt")
    )
    outer_dimension_1 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Kích thước 1 (Ø/a/w) mm")
    )
    outer_dimension_2 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Kích thước 2 (b/h) mm")
    )
    thickness = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Độ dày thành t mm")
    )
    standard_bar_length = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=6000.00,
        verbose_name=_("Chiều dài thanh tiêu chuẩn mm")
    )
    end_trim_loss = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00,
        verbose_name=_("Hao hụt đầu mẩu bavia mm")
    )
    saw_kerf_loss = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=3.00,
        verbose_name=_("Bề dày mạch cưa mm")
    )
    weight_per_meter_kg = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        verbose_name=_("Định lượng kg/m thực tế")
    )
    mold_code = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name=_("Mã khuôn ép NCC")
    )
    features = models.CharField(
        max_length=50,
        blank=True,
        default='',
        verbose_name=_("Ký hiệu phụ (Gân/Gờ...)")
    )

    class Meta:
        db_table = "MetalMaterialSpecs"
        verbose_name = _("Quy cách phôi kim loại")
        verbose_name_plural = _("Bảng Quy cách phôi kim loại")
        ordering = ['-updated_at', 'material_id']
        indexes = [
            models.Index(fields=['-updated_at', 'material_id']),
            models.Index(fields=['profile_shape']),
            models.Index(fields=['mold_code']),
        ]

    def __str__(self):
        return f"MetalSpec: {self.material.material_code} ({self.get_profile_shape_display()})"

