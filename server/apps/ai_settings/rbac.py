"""Phân quyền Cấu hình AI — giáo viên được xem, chỉ ADMIN sửa."""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'AI_SETTING',
        'module_name': 'Cấu hình AI',
        'module_name_en': 'AI settings',
        'icon': 'ExperimentOutlined',
        'route_path': '/ai-settings',
        'parent_code': None,
        'sort_order': 70,
        'is_navigation': True,
        'is_active': True,
        'description': 'Prompt gia sư, model Gemini, bộ lọc nội dung, tham số RAG',
        'description_en': 'Tutor prompt, Gemini model, content guard, RAG parameters',
    },
]

PERMISSIONS = crud_permissions('AI_SETTING', 'cấu hình AI')

ROLE_PERMISSIONS = {
    'TEACHER': perm_codes('AI_SETTING', 'VIEW', 'READ'),
}
