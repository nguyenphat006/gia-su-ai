from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.decorators import action

from apps.core.image_upload import IMAGE_UPLOADED, save_uploaded_image
from apps.core.responses import success_response

from apps.core.permissions import ModulePermissionChecker
from apps.core.viewsets import BaseERPViewSet

from .models import Customer
from .serializers import CustomerCreateUpdateSerializer, CustomerSerializer

TAG = "Khách hàng"


@extend_schema_view(
    list=extend_schema(tags=[TAG], summary="Danh sách khách hàng"),
    retrieve=extend_schema(tags=[TAG], summary="Chi tiết khách hàng"),
    create=extend_schema(tags=[TAG], summary="Tạo mới khách hàng"),
    update=extend_schema(tags=[TAG], summary="Cập nhật khách hàng"),
    partial_update=extend_schema(tags=[TAG], summary="Cập nhật một phần khách hàng"),
    destroy=extend_schema(tags=[TAG], summary="Xóa mềm khách hàng"),
)
class CustomerViewSet(BaseERPViewSet):
    """
    Khách hàng: CRUD, statistics, batch-delete/status, export-excel có sẵn từ BaseERPViewSet.
    Quy tắc nghiệp vụ: override check_can_destroy / check_can_change_status / after_write.
    """
    queryset = Customer.objects.select_related('created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = CustomerSerializer
    write_serializer_class = CustomerCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'CUSTOMER'
    # Tải logo trước khi lưu form → cần quyền tạo hoặc sửa
    custom_action_permissions = {'upload_logo': ['CUSTOMER_CREATE', 'CUSTOMER_UPDATE']}
    # Lookup cho bộ lọc theo cột ở frontend (ListColumn.filter)
    filterset_fields = {
        'is_active': ['exact'],
        'customer_code': ['icontains'],
        'customer_name': ['icontains'],
        'country': ['exact', 'in'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['customer_code', 'customer_name', 'country', 'description']
    ordering_fields = ['created_at', 'updated_at', 'customer_code', 'customer_name', 'country']

    @extend_schema(tags=[TAG], summary="Tải lên logo khách hàng (trả URL để gửi kèm form)")
    @action(detail=False, methods=['post'], url_path='upload-logo')
    def upload_logo(self, request):
        data = save_uploaded_image(request, 'customers', prefix='cus', max_size_mb=2)
        return success_response(data=data, message=IMAGE_UPLOADED, status_code=status.HTTP_201_CREATED)
