import re
from rest_framework import serializers
from .models import UnitOfMeasure, MaterialCategory, Material, MetalMaterialSpec
from django.utils.translation import gettext_lazy as _

class UnitOfMeasureSerializer(serializers.ModelSerializer):
    """
    Serializer hiển thị thông tin chi tiết Đơn vị tính (UOM).
    """
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    updated_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)

    class Meta:
        model = UnitOfMeasure
        fields = [
            'id',
            'code',
            'name',
            'description',
            'is_active',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UnitOfMeasureCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer tiếp nhận tạo mới hoặc cập nhật Đơn vị tính từ Form.
    """
    class Meta:
        model = UnitOfMeasure
        fields = [
            'id',
            'code',
            'name',
            'description',
            'is_active',
        ]
        extra_kwargs = {
            'code': {'required': True},
            'name': {'required': True},
        }

    def validate_code(self, value):
        code = value.upper().strip()
        if not re.match(r'^[A-Z0-9_]+$', code):
            raise serializers.ValidationError(_("Mã ĐVT chỉ được chứa chữ cái in hoa, số và dấu gạch dưới (Ví dụ: PCS, M3, SET)."))
        
        # Kiểm tra trùng lặp mã khi tạo hoặc sửa
        instance = getattr(self, 'instance', None)
        qs = UnitOfMeasure.objects.filter(code=code, deleted_at__isnull=True)
        if instance:
            qs = qs.exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError(_("Mã Đơn vị tính '%(code)s' đã tồn tại trong hệ thống.") % {"code": code})
        return code

    def validate_name(self, value):
        name = value.strip()
        if len(name) < 1:
            raise serializers.ValidationError(_("Tên Đơn vị tính không được để trống."))
        return name


class MaterialCategorySerializer(serializers.ModelSerializer):
    """
    Serializer hiển thị danh sách và chi tiết Nhóm Nguyên Vật Liệu.
    """
    parent_code = serializers.CharField(source='parent.code', read_only=True, default=None)
    parent_name = serializers.CharField(source='parent.name', read_only=True, default=None)
    children_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    updated_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)

    class Meta:
        model = MaterialCategory
        fields = [
            'id',
            'code',
            'name',
            'parent',
            'parent_code',
            'parent_name',
            'children_count',
            'sort_order',
            'description',
            'is_active',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_children_count(self, obj) -> int:
        # Dùng giá trị annotate từ queryset của ViewSet (tránh N+1); fallback cho bản ghi đơn lẻ
        annotated = getattr(obj, 'active_children_count', None)
        return annotated if annotated is not None else obj.children.count()


class MaterialCategoryTreeSerializer(serializers.ModelSerializer):
    """
    Serializer phục vụ cấu trúc cây (TreeSelect / Tree Table) cho Nhóm NVL.
    """
    key = serializers.IntegerField(source='id', read_only=True)
    value = serializers.IntegerField(source='id', read_only=True)
    title = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = MaterialCategory
        fields = [
            'id',
            'key',
            'value',
            'title',
            'code',
            'name',
            'sort_order',
            'is_active',
            'children',
        ]

    def get_title(self, obj):
        return obj.name

    def get_children(self, obj):
        children = obj.children.filter(deleted_at__isnull=True).order_by('sort_order', '-updated_at', 'id')
        if children.exists():
            return MaterialCategoryTreeSerializer(children, many=True).data
        return []


class MaterialCategoryCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer tạo mới hoặc cập nhật Nhóm Nguyên Vật Liệu từ Form.
    """
    class Meta:
        model = MaterialCategory
        fields = [
            'id',
            'code',
            'name',
            'parent',
            'sort_order',
            'description',
            'is_active',
        ]
        read_only_fields = ['id', 'sort_order']
        extra_kwargs = {
            'code': {'required': True},
            'name': {'required': True},
        }

    def validate_code(self, value):
        code = value.upper().strip()
        if not re.match(r'^[A-Z0-9_-]+$', code):
            raise serializers.ValidationError(_("Mã nhóm NVL chỉ được chứa chữ cái in hoa, số, dấu gạch dưới và gạch ngang (Ví dụ: WOOD, METAL, CHEMICAL_PAINT)."))

        instance = getattr(self, 'instance', None)
        qs = MaterialCategory.objects.filter(code=code, deleted_at__isnull=True)
        if instance:
            qs = qs.exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError(_("Mã nhóm NVL '%(code)s' đã tồn tại trong hệ thống.") % {"code": code})
        return code

    def validate_name(self, value):
        name = value.strip()
        if len(name) < 1:
            raise serializers.ValidationError(_("Tên nhóm NVL không được để trống."))
        return name

    def validate(self, attrs):
        parent = attrs.get('parent', None)
        instance = getattr(self, 'instance', None)
        if instance and parent:
            if parent.id == instance.id:
                raise serializers.ValidationError({"parent": _("Không thể chọn chính danh mục này làm danh mục cha.")})
            
            # Kiểm tra chống vòng lặp đệ quy (parent không thể là con cháu của instance)
            curr = parent
            while curr is not None:
                if curr.id == instance.id:
                    raise serializers.ValidationError({"parent": _("Không thể chọn danh mục con cháu làm danh mục cha (nguy cơ tạo vòng lặp vô tận).")})
                curr = curr.parent
        return attrs


class MetalMaterialSpecSerializer(serializers.ModelSerializer):
    """
    Serializer hiển thị và cập nhật thông số phôi kim loại.
    """
    profile_shape_display = serializers.CharField(source='get_profile_shape_display', read_only=True)

    class Meta:
        model = MetalMaterialSpec
        fields = [
            'profile_shape',
            'profile_shape_display',
            'outer_dimension_1',
            'outer_dimension_2',
            'thickness',
            'standard_bar_length',
            'end_trim_loss',
            'saw_kerf_loss',
            'weight_per_meter_kg',
            'mold_code',
            'features',
            'description',
        ]


class MaterialSerializer(serializers.ModelSerializer):
    """
    Serializer hiển thị chi tiết Nguyên vật liệu (kèm nested Metal Spec nếu có).
    """
    category_id = serializers.IntegerField(source='category.id', read_only=True)
    category_code = serializers.CharField(source='category.code', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    category_parent_id = serializers.IntegerField(source='category.parent_id', read_only=True, allow_null=True)
    base_uom_id = serializers.IntegerField(source='base_uom.id', read_only=True)
    base_uom_code = serializers.CharField(source='base_uom.code', read_only=True)
    base_uom_name = serializers.CharField(source='base_uom.name', read_only=True)
    metal_spec = MetalMaterialSpecSerializer(read_only=True)

    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default='')
    updated_by_name = serializers.CharField(source='updated_by.full_name', read_only=True, default='')
    created_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)
    updated_at = serializers.DateTimeField(format="%d/%m/%Y %H:%M", read_only=True)

    class Meta:
        model = Material
        fields = [
            'id',
            'material_code',
            'material_name',
            'category_id',
            'category_code',
            'category_name',
            'category_parent_id',
            'base_uom_id',
            'base_uom_code',
            'base_uom_name',
            'image_url',
            'metal_spec',
            'description',
            'is_active',
            'created_by_name',
            'updated_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MaterialCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer tạo mới hoặc cập nhật Nguyên vật liệu (kèm lồng metal_spec atomic).
    """
    metal_spec = MetalMaterialSpecSerializer(required=False, allow_null=True)

    class Meta:
        model = Material
        fields = [
            'id',
            'material_code',
            'material_name',
            'category',
            'base_uom',
            'image_url',
            'metal_spec',
            'description',
            'is_active',
        ]
        extra_kwargs = {
            'material_code': {'required': False, 'validators': []},  # tính duy nhất do validate_material_code + service đảm bảo
            'material_name': {'required': True},
            'category': {'required': True},
            'base_uom': {'required': True},
        }

    def validate_material_code(self, value):
        code = value.upper().strip()
        instance = getattr(self, 'instance', None)
        if instance is None:
            # Tạo mới: mã do services.material_code cấp (tự đổi sang mã kế tiếp nếu trùng) -> không chặn ở đây
            return code
        qs = Material.all_objects.filter(material_code=code).exclude(id=instance.id)
        if qs.exists():
            raise serializers.ValidationError(_("Mã Nguyên vật liệu '%(code)s' đã tồn tại trong hệ thống.") % {"code": code})
        return code

    def validate_material_name(self, value):
        name = value.strip()
        if len(name) < 1:
            raise serializers.ValidationError(_("Tên Nguyên vật liệu không được để trống."))
        return name

    def create(self, validated_data):
        from django.db import transaction
        metal_spec_data = validated_data.pop('metal_spec', None)
        with transaction.atomic():
            material = Material.objects.create(**validated_data)
            if metal_spec_data:
                # Bỏ description nếu không cần hoặc giữ lại
                MetalMaterialSpec.objects.create(material=material, **metal_spec_data)
            return material

    def update(self, instance, validated_data):
        from django.db import transaction
        metal_spec_data = validated_data.pop('metal_spec', None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            if metal_spec_data is not None:
                MetalMaterialSpec.objects.update_or_create(
                    material=instance,
                    defaults=metal_spec_data
                )
            return instance

