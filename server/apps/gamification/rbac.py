"""
Quyền cổng học sinh (LEARN) — dùng chung cho mọi API phía học sinh: gia sư AI, ôn tập, đấu trường, thành tích.
Không hiện trên menu quản trị (is_navigation=False). Giáo viên cũng có để dùng thử giao diện học sinh.
"""
from apps.core.rbac_registry import perm_codes

MODULES = [
    {
        'module_code': 'LEARN',
        'module_name': 'Cổng học sinh',
        'module_name_en': 'Student portal',
        'icon': 'ExperimentOutlined',
        'route_path': '/learn',
        'parent_code': None,
        'sort_order': 5,
        'is_navigation': False,
        'is_active': True,
        'description': 'Học với gia sư AI, ôn tập, đấu trường, thành tích',
        'description_en': 'AI tutor, practice, arena, achievements',
    },
]

PERMISSIONS = [
    {'permission_code': 'LEARN_VIEW', 'permission_name': 'Vào cổng học sinh', 'module': 'LEARN',
     'description': 'Mở giao diện học sinh /learn.'},
    {'permission_code': 'LEARN_USE', 'permission_name': 'Dùng tính năng học tập', 'module': 'LEARN',
     'description': 'Hỏi gia sư AI, làm bài ôn tập, thi đấu, nhận XP.'},
]

ROLE_PERMISSIONS = {
    'STUDENT': perm_codes('LEARN', 'VIEW', 'USE'),
    'TEACHER': perm_codes('LEARN', 'VIEW', 'USE'),
}
