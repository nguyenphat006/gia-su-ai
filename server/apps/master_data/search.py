"""
Nguồn tìm kiếm toàn cục của master_data — `apps/core/search_registry.py` tự gom file này.
Đơn vị tính / nhóm NVL chưa có trang chi tiết → mở danh sách đã lọc theo mã.
"""
from apps.core.search_registry import SearchProvider

from .models import Material, MaterialCategory, UnitOfMeasure

SEARCH_PROVIDERS = [
    SearchProvider(
        module_code='MATERIAL',
        model=Material,
        code_field='material_code',
        title_field='material_name',
        extra_fields=('metal_spec__mold_code',),
        subtitle=lambda m: m.category.name if m.category_id else None,
        image_field='image_url',
        select_related=('category',),
        url='/master-data/materials/{id}',
    ),
    SearchProvider(
        module_code='MATERIAL_CATEGORY',
        model=MaterialCategory,
        code_field='code',
        title_field='name',
        subtitle=lambda c: c.parent.name if c.parent_id else None,
        select_related=('parent',),
        url='/master-data/material-categories?q={code}',
    ),
    SearchProvider(
        module_code='UNIT',
        model=UnitOfMeasure,
        code_field='code',
        title_field='name',
        url='/master-data/units?q={code}',
    ),
]
