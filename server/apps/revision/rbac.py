"""Phân quyền Ôn tập: ngân hàng câu hỏi, flashcard, sơ đồ tư duy (nhóm menu REVISION)."""
from apps.core.rbac_registry import crud_permissions, perm_codes

MODULES = [
    {
        'module_code': 'REVISION',
        'module_name': 'Ôn tập',
        'module_name_en': 'Revision',
        'icon': 'FileTextOutlined',
        'route_path': None,
        'parent_code': None,
        'sort_order': 30,
        'is_navigation': True,
        'is_active': True,
        'description': 'Nhóm menu: ngân hàng câu hỏi, flashcard, sơ đồ tư duy',
        'description_en': 'Menu group: question bank, flashcards, mind maps',
    },
    {
        'module_code': 'QUESTION',
        'module_name': 'Ngân hàng câu hỏi',
        'module_name_en': 'Question bank',
        'icon': 'CheckCircleOutlined',
        'route_path': '/revision/questions',
        'parent_code': 'REVISION',
        'sort_order': 10,
        'is_navigation': True,
        'is_active': True,
        'description': 'Câu hỏi trắc nghiệm / tự luận dùng cho ôn tập và đấu trường',
        'description_en': 'Multiple-choice and essay questions for practice and arena',
    },
    {
        'module_code': 'FLASHCARD',
        'module_name': 'Flashcard',
        'module_name_en': 'Flashcards',
        'icon': 'BlocksOutlined',
        'route_path': '/revision/flashcards',
        'parent_code': 'REVISION',
        'sort_order': 20,
        'is_navigation': True,
        'is_active': True,
        'description': 'Bộ thẻ ghi nhớ theo chủ đề',
        'description_en': 'Flashcard decks by topic',
    },
    {
        'module_code': 'MINDMAP',
        'module_name': 'Sơ đồ tư duy',
        'module_name_en': 'Mind maps',
        'icon': 'DeploymentUnitOutlined',
        'route_path': '/revision/mindmaps',
        'parent_code': 'REVISION',
        'sort_order': 30,
        'is_navigation': True,
        'is_active': True,
        'description': 'Sơ đồ tư duy theo chủ đề',
        'description_en': 'Mind maps by topic',
    },
]

PERMISSIONS = [
    *crud_permissions('QUESTION', 'câu hỏi'),
    *crud_permissions('FLASHCARD', 'flashcard'),
    *crud_permissions('MINDMAP', 'sơ đồ tư duy'),
]

_TEACHER_ACTIONS = ('VIEW', 'READ', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT')
ROLE_PERMISSIONS = {
    'TEACHER': [
        *perm_codes('QUESTION', *_TEACHER_ACTIONS),
        *perm_codes('FLASHCARD', *_TEACHER_ACTIONS),
        *perm_codes('MINDMAP', *_TEACHER_ACTIONS),
    ],
}
