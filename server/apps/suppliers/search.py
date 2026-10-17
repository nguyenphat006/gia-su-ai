"""
Nguồn tìm kiếm toàn cục của phân hệ nhà cung cấp — apps/core/search_registry.py tự gom file này.
Có trang chi tiết thì đổi url thành '/master-data/suppliers/{id}'.
"""
from apps.core.search_registry import SearchProvider

from .models import Supplier

SEARCH_PROVIDERS = [
    SearchProvider(
        module_code='SUPPLIER',
        model=Supplier,
        code_field='supplier_code',
        title_field='supplier_name',
        extra_fields=('tax_code',),
        subtitle='phone',
        url='/master-data/suppliers?q={code}',
    ),
]
