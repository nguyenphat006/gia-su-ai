from django.utils.translation import gettext as _

from django.db import transaction
from django.db.models import Case, Count, Max, Q, Value, When
from django.db.models.functions import Coalesce
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, ValidationError

from apps.core.exceptions import BusinessError
from apps.core.image_upload import IMAGE_UPLOADED, save_uploaded_image
from apps.core.permissions import ModulePermissionChecker
from apps.core.responses import success_response
from apps.core.viewsets import BaseERPViewSet

from .models import Material, MaterialCategory, UnitOfMeasure
from .serializers import (
    MaterialCategoryCreateUpdateSerializer,
    MaterialCategorySerializer,
    MaterialCategoryTreeSerializer,
    MaterialCreateUpdateSerializer,
    MaterialSerializer,
    UnitOfMeasureCreateUpdateSerializer,
    UnitOfMeasureSerializer,
)
from .services.material_code import calculate_next_code, create_material_with_code, get_category_prefix


def crud_schema(tag: str, entity: str):
    """Gắn tag + summary tiếng Việt cho 6 action CRUD trên Swagger."""
    return extend_schema_view(
        list=extend_schema(tags=[tag], summary=f"Danh sách {entity}"),
        retrieve=extend_schema(tags=[tag], summary=f"Chi tiết {entity}"),
        create=extend_schema(tags=[tag], summary=f"Tạo mới {entity}"),
        update=extend_schema(tags=[tag], summary=f"Cập nhật {entity}"),
        partial_update=extend_schema(tags=[tag], summary=f"Cập nhật một phần {entity}"),
        destroy=extend_schema(tags=[tag], summary=f"Xóa mềm {entity}"),
    )


UNIT_TAG = 'Danh mục Đơn vị tính (Units of Measure)'
CATEGORY_TAG = 'Danh mục Nhóm Nguyên Vật Liệu (Material Categories)'
MATERIAL_TAG = 'Danh mục Nguyên Vật Liệu (Materials)'


@crud_schema(UNIT_TAG, "đơn vị tính")
class UnitOfMeasureViewSet(BaseERPViewSet):
    """Danh mục Đơn vị tính (UOM) dùng trong BOM, sản xuất và vật tư."""
    queryset = UnitOfMeasure.objects.select_related('created_by', 'updated_by').order_by('-updated_at', 'id')
    serializer_class = UnitOfMeasureSerializer
    write_serializer_class = UnitOfMeasureCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'UNIT'
    # Lookup cho bộ lọc theo cột ở frontend (ListColumn.filter)
    filterset_fields = {
        'is_active': ['exact'],
        'code': ['icontains'],
        'name': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['created_at', 'updated_at', 'code', 'name']

    def check_can_destroy(self, instance):
        if instance.materials.exists():
            raise BusinessError(_("Không thể xóa ĐVT '%(code)s' vì đang được nguyên vật liệu sử dụng.") % {"code": instance.code})


@crud_schema(CATEGORY_TAG, "nhóm nguyên vật liệu")
class MaterialCategoryViewSet(BaseERPViewSet):
    """Nhóm Nguyên Vật Liệu dạng cây cha - con, sắp xếp theo `sort_order`."""
    queryset = (
        MaterialCategory.objects
        .select_related('parent', 'created_by', 'updated_by')
        .annotate(active_children_count=Count('children', filter=Q(children__deleted_at__isnull=True)))
        .order_by('sort_order', '-updated_at', 'id')
    )
    serializer_class = MaterialCategorySerializer
    write_serializer_class = MaterialCategoryCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'MATERIAL_CATEGORY'
    custom_action_permissions = {
        'tree': 'MATERIAL_CATEGORY_READ',
        'move_order': 'MATERIAL_CATEGORY_UPDATE',
    }
    filterset_fields = {
        'is_active': ['exact'],
        'parent': ['exact', 'in', 'isnull'],
        'code': ['icontains'],
        'name': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['sort_order', 'code', 'name', 'created_at', 'updated_at']

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.query_params.get('ordering'):
            # Mặc định hiển thị theo cây: nhóm gốc (theo sort_order) rồi ngay sau là các nhóm con của nó
            qs = qs.annotate(
                root_order=Coalesce('parent__sort_order', 'sort_order'),
                root_id=Coalesce('parent_id', 'id'),
                is_child=Case(When(parent__isnull=True, then=Value(0)), default=Value(1)),
            ).order_by('root_order', 'root_id', 'is_child', 'sort_order', 'id')
        return qs

    def perform_create(self, serializer):
        parent = serializer.validated_data.get('parent')
        last_order = MaterialCategory.objects.filter(parent=parent).aggregate(Max('sort_order'))['sort_order__max']
        user = self._current_user()
        return serializer.save(
            created_by=user,
            updated_by=user,
            sort_order=(last_order + 10) if last_order is not None else 10,
        )

    def check_can_destroy(self, instance):
        if instance.children.exists():
            raise BusinessError(_("Không thể xóa nhóm '%(code)s' vì còn nhóm con.") % {"code": instance.code})
        if instance.materials.exists():
            raise BusinessError(_("Không thể xóa nhóm '%(code)s' vì còn nguyên vật liệu thuộc nhóm.") % {"code": instance.code})

    @extend_schema(tags=[CATEGORY_TAG], summary="Cây phân cấp Nhóm NVL (cho TreeSelect / Tree Table)")
    @action(detail=False, methods=['get'], url_path='tree')
    def tree(self, request):
        roots = MaterialCategory.objects.filter(parent__isnull=True).order_by('sort_order', '-updated_at', 'id')
        return success_response(data=MaterialCategoryTreeSerializer(roots, many=True).data)

    @extend_schema(tags=[CATEGORY_TAG], summary="Di chuyển thứ tự hiển thị lên / xuống trong cùng nhóm cha")
    @action(detail=True, methods=['post'], url_path='move-order')
    def move_order(self, request, pk=None):
        """Body: {"direction": "up" | "down"}"""
        category = self.get_object()
        direction = request.data.get('direction')
        if direction not in ('up', 'down'):
            raise ValidationError({'direction': [_("Giá trị phải là 'up' hoặc 'down'.")]})

        with transaction.atomic():
            siblings = list(
                MaterialCategory.objects.select_for_update()
                .filter(parent=category.parent)
                .order_by('sort_order', 'id')
            )
            index = next(i for i, s in enumerate(siblings) if s.id == category.id)
            target = index - 1 if direction == 'up' else index + 1
            if target < 0 or target >= len(siblings):
                if direction == 'up':
                    return success_response(message=_("Nhóm vật tư đã ở vị trí đầu tiên"))
                return success_response(message=_("Nhóm vật tư đã ở vị trí cuối cùng"))

            siblings[index], siblings[target] = siblings[target], siblings[index]
            changed = []
            for i, s in enumerate(siblings):
                new_order = (i + 1) * 10
                if s.sort_order != new_order:
                    s.sort_order = new_order
                    changed.append(s)
            MaterialCategory.objects.bulk_update(changed, ['sort_order'])

        return success_response(message=_("Đã di chuyển nhóm vật tư lên") if direction == 'up' else _("Đã di chuyển nhóm vật tư xuống"))


@crud_schema(MATERIAL_TAG, "nguyên vật liệu")
class MaterialViewSet(BaseERPViewSet):
    """Nguyên Vật Liệu & quy cách phôi kim loại (MetalMaterialSpecs). Mã NVL do hệ thống cấp."""
    queryset = (
        Material.objects
        .select_related('category', 'base_uom', 'metal_spec', 'created_by', 'updated_by')
        .order_by('-updated_at', 'id')
    )
    serializer_class = MaterialSerializer
    write_serializer_class = MaterialCreateUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, ModulePermissionChecker]
    permission_module = 'MATERIAL'
    custom_action_permissions = {
        'next_code': 'MATERIAL_READ',
        'upload_image': 'MATERIAL_CREATE',
    }
    filterset_fields = {
        'is_active': ['exact'],
        'base_uom': ['exact', 'in'],
        'category': ['in'],
        'metal_spec__profile_shape': ['exact'],
        'material_code': ['icontains'],
        'material_name': ['icontains'],
        'updated_at': ['date__gte', 'date__lte'],
    }
    search_fields = ['material_code', 'material_name', 'description', 'metal_spec__mold_code']
    ordering_fields = ['created_at', 'updated_at', 'material_code', 'material_name']

    ALLOWED_IMAGE_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.webp', '.svg')
    MAX_IMAGE_SIZE_MB = 10

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        # Lọc theo nhóm, bao gồm các nhóm con trực tiếp
        category_id = params.get('category')
        if category_id and category_id.isdigit():
            cat_id = int(category_id)
            child_ids = MaterialCategory.objects.filter(parent_id=cat_id).values_list('id', flat=True)
            qs = qs.filter(category_id__in=[cat_id, *child_ids])

        profile_shape = params.get('profile_shape')
        if profile_shape:
            qs = qs.filter(metal_spec__profile_shape=profile_shape)
        return qs

    def perform_create(self, serializer):
        user = self._current_user()
        return create_material_with_code(serializer, created_by=user, updated_by=user)

    @extend_schema(tags=[MATERIAL_TAG], summary="Tải lên ảnh đại diện / mặt cắt cho NVL")
    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        data = save_uploaded_image(
            request, 'materials', prefix='mat', extensions=self.ALLOWED_IMAGE_EXTENSIONS, max_size_mb=self.MAX_IMAGE_SIZE_MB
        )
        return success_response(data=data, message=IMAGE_UPLOADED, status_code=status.HTTP_201_CREATED)

    @extend_schema(tags=[MATERIAL_TAG], summary="Mã NVL gợi ý tiếp theo của một nhóm")
    @action(detail=False, methods=['get'], url_path='next-code')
    def next_code(self, request):
        category_id = request.query_params.get('category_id')
        if not category_id:
            raise ValidationError({'category_id': [_("Vui lòng cung cấp category_id.")]})
        category = MaterialCategory.objects.filter(id=category_id).first()
        if category is None:
            raise NotFound(_("Không tìm thấy nhóm vật tư."))

        prefix = get_category_prefix(category)
        return success_response(data={
            "prefix": prefix,
            "next_code": calculate_next_code(prefix),
            "category_id": category.id,
            "category_name": category.name,
        })
