from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions

from apps.core.permissions import ModulePermissionChecker
from apps.core.viewsets import BaseERPViewSet

from .models import Supplier
from .serializers import SupplierCreateUpdateSerializer, SupplierSerializer

TAG = "Nhà cung cấp"


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="Danh sách nhà cung cấp"),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết nhà cung cấp"),
    create=extend_schema(tags=[TAG], summary="Tạo mới nhà cung cấp"),
    update=extend_schema(tags=[TAG], summary="Cập nhật nhà cung cấp"),
    partial_update=extend_schema(tags=[TAG], summary="Cập nhật một phần nhà cung cấp"),
    destroy=extend_schema(tags=[TAG], summary="Xóa mềm nhà cung cấp"),
)
class SupplierViewSet(BaseERPViewSet):
    """
    Nhà cung cấp: CRUD, statistics, batch-delete/status, export-excel có sẵn từ BaseERPViewSet.
    Quy tắc nghiệp vụ: override check_can_destroy / check_can_change_status / after_write.
    """
    queryset = Supplier.objects.select_related('created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = SupplierSerializer
    write_serializer_class = SupplierCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'SUPPLIER'
    # Lookup cho bộ lọc theo cột ở frontend (ListColumn.filter)
    filterset_fields = {
        'is_active': ['exact'],
        'supplier_code': ['icontains'],
        'supplier_name': ['icontains'],
        'tax_code': ['icontains'],
        'phone': ['icontains'],
        'email': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['supplier_code', 'supplier_name', 'tax_code', 'phone', 'email', 'description']
    ordering_fields = ['created_at', 'updated_at', 'supplier_code', 'supplier_name']
