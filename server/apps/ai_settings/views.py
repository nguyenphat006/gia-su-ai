from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions

from apps.core.exceptions import BusinessError
from apps.core.permissions import ModulePermissionChecker
from apps.core.viewsets import BaseERPViewSet

from . import services
from .defaults import DEFAULT_SETTINGS
from .models import AiSetting
from .serializers import AiSettingCreateUpdateSerializer, AiSettingSerializer

TAG = "Cấu hình AI"


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="Danh sách cấu hình AI"),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết cấu hình AI"),
    create=extend_schema(tags=[TAG], summary="Thêm cấu hình AI"),
    update=extend_schema(tags=[TAG], summary="Cập nhật cấu hình AI"),
    partial_update=extend_schema(tags=[TAG], summary="Cập nhật một phần cấu hình AI"),
    destroy=extend_schema(tags=[TAG], summary="Xóa mềm cấu hình AI"),
)
class AiSettingViewSet(BaseERPViewSet):
    """Cấu hình AI (prompt, model, bộ lọc...). Khóa hệ thống không xóa được; sửa xong có hiệu lực ngay (xóa cache)."""
    queryset = AiSetting.objects.select_related('updated_by').order_by('key')
    serializer_class = AiSettingSerializer
    write_serializer_class = AiSettingCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'AI_SETTING'
    filterset_fields = {
        'is_active': ['exact'],
        'value_type': ['exact', 'in'],
        'key': ['icontains'],
        'label': ['icontains'],
    }
    search_fields = ['key', 'label', 'value', 'description']
    ordering_fields = ['key', 'label', 'updated_at']

    def check_can_destroy(self, instance):
        if instance.key in DEFAULT_SETTINGS:
            raise BusinessError(_("Không xóa được cấu hình hệ thống %(key)s.") % {"key": instance.key})

    def check_can_change_status(self, instance, is_active: bool):
        if not is_active and instance.key in DEFAULT_SETTINGS:
            raise BusinessError(_("Không tắt được cấu hình hệ thống %(key)s — hãy sửa giá trị.") % {"key": instance.key})

    def after_write(self, instance=None):
        services.invalidate()
