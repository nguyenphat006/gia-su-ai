"""Phân quyền Tri thức RAG (tài liệu nguồn + đoạn tri thức)."""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'KNOWLEDGE',
        'module_name': 'Tri thức RAG',
        'module_name_en': 'Knowledge base',
        'icon': 'DatabaseOutlined',
        'route_path': '/knowledge',
        'parent_code': None,
        'sort_order': 40,
        'is_navigation': True,
        'is_active': True,
        'description': 'Tài liệu giáo viên tải lên và các đoạn tri thức gia sư AI dùng để trả lời',
        'description_en': 'Teacher documents and knowledge chunks used by the AI tutor',
    },
]

PERMISSIONS = crud_permissions('KNOWLEDGE', 'tri thức RAG')

ROLE_PERMISSIONS = {
    'TEACHER': perm_codes('KNOWLEDGE', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT'),
}
