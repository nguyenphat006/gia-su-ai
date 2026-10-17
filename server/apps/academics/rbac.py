"""
Phân quyền phân hệ Học vụ (lớp học, học sinh, giáo viên) — seed_core tự gom file này.
ADMIN luôn có toàn bộ quyền.
"""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'ACADEMICS',
        'module_name': 'Học vụ',
        'module_name_en': 'Academics',
        'icon': 'TeamOutlined',
        'route_path': None,
        'parent_code': None,
        'sort_order': 20,
        'is_navigation': True,
        'is_active': True,
        'description': 'Nhóm menu: lớp học, học sinh, giáo viên',
        'description_en': 'Menu group: classes, students, teachers',
    },
    {
        'module_code': 'CLASS',
        'module_name': 'Lớp học',
        'module_name_en': 'Classes',
        'icon': 'ApartmentOutlined',
        'route_path': '/academics/classes',
        'parent_code': 'ACADEMICS',
        'sort_order': 10,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý lớp học theo khối và năm học',
        'description_en': 'Manage classes by grade and school year',
    },
    {
        'module_code': 'STUDENT',
        'module_name': 'Học sinh',
        'module_name_en': 'Students',
        'icon': 'UserOutlined',
        'route_path': '/academics/students',
        'parent_code': 'ACADEMICS',
        'sort_order': 20,
        'is_navigation': True,
        'is_active': True,
        'description': 'Tài khoản và hồ sơ học sinh, nhập danh sách từ Excel',
        'description_en': 'Student accounts and profiles, Excel import',
    },
    {
        'module_code': 'TEACHER',
        'module_name': 'Giáo viên',
        'module_name_en': 'Teachers',
        'icon': 'IdcardOutlined',
        'route_path': '/academics/teachers',
        'parent_code': 'ACADEMICS',
        'sort_order': 30,
        'is_navigation': True,
        'is_active': True,
        'description': 'Tài khoản và hồ sơ giáo viên',
        'description_en': 'Teacher accounts and profiles',
    },
]

PERMISSIONS = [
    *crud_permissions('CLASS', 'lớp học'),
    *crud_permissions('STUDENT', 'học sinh'),
    *crud_permissions('TEACHER', 'giáo viên'),
]

ROLE_PERMISSIONS = {
    'TEACHER': [
        *perm_codes('CLASS', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'EXPORT'),
        *perm_codes('STUDENT', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT'),
        *perm_codes('TEACHER', 'VIEW', 'READ'),
    ],
}
