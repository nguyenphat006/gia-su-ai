"""
Phân quyền phân hệ khách hàng — seed_core tự gom file này (apps/core/rbac_registry.py).
Sửa quyền mặc định theo vai trò ở ROLE_PERMISSIONS; ADMIN luôn có toàn bộ quyền.
"""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'CUSTOMER',
        'module_name': 'Khách hàng',
        'module_name_en': 'Customers',  # trống -> menu tiếng Anh dùng tên tiếng Việt
        'icon': 'TeamOutlined',
        'route_path': '/master-data/customers',
        'parent_code': 'MASTER_DATA',
        'sort_order': 5,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý danh mục khách hàng',
        'description_en': None,
    },
]

PERMISSIONS = crud_permissions('CUSTOMER', 'khách hàng')

ROLE_PERMISSIONS = {
    'MANAGER': perm_codes('CUSTOMER', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'EXPORT'),
    'STAFF': perm_codes('CUSTOMER', 'VIEW', 'READ'),
}
