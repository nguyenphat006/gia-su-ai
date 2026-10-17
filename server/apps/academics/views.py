from django.db.models import Count, Q
from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.decorators import action

from apps.core.exceptions import BusinessError
from apps.core.permissions import ModulePermissionChecker
from apps.core.responses import success_response
from apps.core.viewsets import BaseERPViewSet

from . import services
from .models import SchoolClass, StudentProfile, TeacherProfile
from .serializers import (
    SchoolClassCreateUpdateSerializer, SchoolClassSerializer, StudentCreateUpdateSerializer,
    StudentImportResultSerializer, StudentImportSerializer, StudentSerializer, TeacherCreateUpdateSerializer,
    TeacherSerializer,
)


def _crud_schema(tag: str, label: str):
    return extend_schema_view(
        list=extend_schema(tags=[tag], summary=f"Danh sách {label}"),
        retrieve=extend_schema(tags=[tag], summary=f"Chi tiết {label}"),
        create=extend_schema(tags=[tag], summary=f"Tạo mới {label}"),
        update=extend_schema(tags=[tag], summary=f"Cập nhật {label}"),
        partial_update=extend_schema(tags=[tag], summary=f"Cập nhật một phần {label}"),
        destroy=extend_schema(tags=[tag], summary=f"Xóa mềm {label}"),
    )


@_crud_schema("Lớp học", "lớp học")
class SchoolClassViewSet(BaseERPViewSet):
    """Lớp học: CRUD + đếm sĩ số. Không xóa được lớp còn học sinh."""
    queryset = (
        SchoolClass.objects.select_related('homeroom_teacher', 'created_by', 'updated_by')
        .annotate(student_count=Count('students', filter=Q(students__deleted_at__isnull=True)))
        .order_by('-updated_at', 'id')
    )
    serializer_class = SchoolClassSerializer
    write_serializer_class = SchoolClassCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'CLASS'
    filterset_fields = {
        'is_active': ['exact'],
        'grade': ['exact', 'in'],
        'academic_year': ['exact', 'icontains'],
        'homeroom_teacher': ['exact'],
        'code': ['icontains'],
        'name': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['code', 'name', 'academic_year']
    ordering_fields = ['created_at', 'updated_at', 'code', 'name', 'grade', 'academic_year', 'student_count']
    excel_excluded_fields = ['homeroom_teacher']

    def check_can_destroy(self, instance):
        if instance.students.filter(deleted_at__isnull=True).exists():
            raise BusinessError(_("Lớp %(name)s còn học sinh — chuyển học sinh sang lớp khác trước khi xóa.") % {"name": instance.name})


class _ProfileViewSet(BaseERPViewSet):
    """Nền chung cho hồ sơ học sinh / giáo viên: xóa / khóa hồ sơ là xóa / khóa luôn tài khoản đăng nhập."""

    def perform_destroy(self, instance):
        services.soft_delete_profile(instance, actor=self._current_user())

    def check_can_destroy(self, instance):
        if instance.user_id == self.request.user.id:
            raise BusinessError(_("Bạn không thể tự xóa tài khoản đang đăng nhập của chính mình."))

    def check_can_change_status(self, instance, is_active: bool):
        if not is_active and instance.user_id == self.request.user.id:
            raise BusinessError(_("Bạn không thể tự khóa tài khoản đang đăng nhập của chính mình."))

    @action(detail=False, methods=['post'], url_path='batch-status')
    def batch_status(self, request):
        response = super().batch_status(request)
        is_active = request.data.get('is_active')
        profiles = self.get_queryset().filter(id__in=self.get_batch_ids(request), is_active=is_active)
        services.deactivate_profile_users(profiles, is_active=is_active)
        return response


@_crud_schema("Học sinh", "học sinh")
class StudentViewSet(_ProfileViewSet):
    """Học sinh: tạo tài khoản + hồ sơ + vai trò STUDENT trong 1 lần; nhập hàng loạt từ Excel."""
    queryset = StudentProfile.objects.select_related('user', 'school_class', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = StudentSerializer
    write_serializer_class = StudentCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'STUDENT'
    filterset_fields = {
        'is_active': ['exact'],
        'grade': ['exact', 'in'],
        'school_class': ['exact', 'in'],
        'student_code': ['icontains'],
        'user__full_name': ['icontains'],
        'user__username': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['student_code', 'user__full_name', 'user__username', 'user__email']
    ordering_fields = ['created_at', 'updated_at', 'student_code', 'grade', 'user__full_name', 'user__last_login']
    excel_columns = [
        {'key': 'student_code', 'label': 'Mã học sinh', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'full_name', 'label': 'Họ và tên', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'username', 'label': 'Tên đăng nhập', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'grade', 'label': 'Khối', 'type': 'number', 'default_selected': True, 'required': True},
        {'key': 'school_class_name', 'label': 'Lớp', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'email', 'label': 'Email', 'type': 'string', 'default_selected': False, 'required': False},
        {'key': 'is_active', 'label': 'Trạng thái hoạt động', 'type': 'boolean', 'default_selected': True, 'required': False},
        {'key': 'last_login', 'label': 'Đăng nhập gần nhất', 'type': 'string', 'default_selected': False, 'required': False},
    ]

    @extend_schema(tags=["Học sinh"], summary="Nhập danh sách học sinh từ Excel",
                   request=StudentImportSerializer, responses={201: StudentImportResultSerializer})
    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        """
        Nhập học sinh từ file .xlsx (cột: Họ và tên, Mã học sinh, Khối, Mã lớp, Tên đăng nhập, Email, Mật khẩu —
        chỉ bắt buộc Họ và tên). Trả kèm danh sách mật khẩu ban đầu đã sinh (chỉ hiện 1 lần).
        """
        payload = StudentImportSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        rows = payload.validated_data.get('rows') or []
        file_obj = payload.validated_data.get('file')
        if file_obj:
            from apps.core.excel_service import ExcelService
            rows = ExcelService.read_excel_file(file_obj)
        result = services.import_students(
            rows, default_grade=payload.validated_data.get('grade'),
            default_class=payload.validated_data.get('school_class'), actor=request.user,
        )
        self.after_write()
        message = _("Đã nhập %(count)s học sinh") % {"count": result['count']}
        if result['errors']:
            message += _(" (%(count)s dòng lỗi bị bỏ qua)") % {"count": len(result['errors'])}
        return success_response(data=StudentImportResultSerializer(result).data, message=message,
                                status_code=status.HTTP_201_CREATED)


@_crud_schema("Giáo viên", "giáo viên")
class TeacherViewSet(_ProfileViewSet):
    """Giáo viên: tạo tài khoản + hồ sơ + vai trò TEACHER."""
    queryset = TeacherProfile.objects.select_related('user', 'created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = TeacherSerializer
    write_serializer_class = TeacherCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'TEACHER'
    filterset_fields = {
        'is_active': ['exact'],
        'subject': ['icontains'],
        'employee_code': ['icontains'],
        'user__full_name': ['icontains'],
        'user__username': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['employee_code', 'subject', 'user__full_name', 'user__username', 'user__email']
    ordering_fields = ['created_at', 'updated_at', 'employee_code', 'user__full_name', 'user__last_login']
    excel_columns = [
        {'key': 'employee_code', 'label': 'Mã giáo viên', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'full_name', 'label': 'Họ và tên', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'username', 'label': 'Tên đăng nhập', 'type': 'string', 'default_selected': True, 'required': True},
        {'key': 'subject', 'label': 'Bộ môn', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'email', 'label': 'Email', 'type': 'string', 'default_selected': True, 'required': False},
        {'key': 'is_active', 'label': 'Trạng thái hoạt động', 'type': 'boolean', 'default_selected': True, 'required': False},
    ]
