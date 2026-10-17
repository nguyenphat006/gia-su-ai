"""Phân quyền Báo cáo học tập (chỉ đọc + xuất file)."""
from apps.core.rbac_registry import perm_codes

MODULES = [
    {
        'module_code': 'REPORT',
        'module_name': 'Báo cáo học tập',
        'module_name_en': 'Learning reports',
        'icon': 'BarChartOutlined',
        'route_path': '/reports',
        'parent_code': None,
        'sort_order': 15,
        'is_navigation': True,
        'is_active': True,
        'description': 'Tổng quan, giờ học, thống kê học sinh, nhật ký hỏi đáp AI, đấu trường, ôn tập',
        'description_en': 'Overview, study hours, student stats, AI chat logs, arena, practice',
    },
]

PERMISSIONS = [
    {'permission_code': f'REPORT_{action}', 'permission_name': f'{name} báo cáo học tập', 'module': 'REPORT',
     'description': f'{name} phân hệ báo cáo học tập.'}
    for action, name in (('VIEW', 'Truy cập màn hình'), ('READ', 'Xem dữ liệu'), ('EXPORT', 'Xuất dữ liệu'))
]

ROLE_PERMISSIONS = {
    'TEACHER': perm_codes('REPORT', 'VIEW', 'READ', 'EXPORT'),
}
