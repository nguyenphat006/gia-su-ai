"""
Nguồn tìm kiếm toàn cục của phân hệ khách hàng — apps/core/search_registry.py tự gom file này.
Có trang chi tiết thì đổi url thành '/master-data/customers/{id}'.
"""
from apps.core.search_registry import SearchProvider

from .models import Customer

SEARCH_PROVIDERS = [
    SearchProvider(
        module_code='CUSTOMER',
        model=Customer,
        code_field='customer_code',
        title_field='customer_name',
        subtitle='country',
        image_field='logo_url',
        url='/master-data/customers?q={code}',
    ),
]
