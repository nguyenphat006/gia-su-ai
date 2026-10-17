"""
Phân quyền phân hệ nhà cung cấp — seed_core tự gom file này (apps/core/rbac_registry.py).
Sửa quyền mặc định theo vai trò ở ROLE_PERMISSIONS; ADMIN luôn có toàn bộ quyền.
"""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'SUPPLIER',
        'module_name': 'Nhà cung cấp',
        'module_name_en': 'Suppliers',  # trống -> menu tiếng Anh dùng tên tiếng Việt
        'icon': 'ShopOutlined',
        'route_path': '/master-data/suppliers',
        'parent_code': 'MASTER_DATA',
        'sort_order': 6,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý danh mục nhà cung cấp',
        'description_en': None,
    },
]

PERMISSIONS = crud_permissions('SUPPLIER', 'nhà cung cấp')

ROLE_PERMISSIONS = {
    'MANAGER': perm_codes('SUPPLIER', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'EXPORT'),
    'STAFF': perm_codes('SUPPLIER', 'VIEW', 'READ'),
}
