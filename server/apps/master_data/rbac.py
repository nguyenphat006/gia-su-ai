"""
Phân quyền của module mẫu master_data (Đơn vị tính, Nhóm NVL, Nguyên vật liệu).
seed_core tự gom file này (apps/core/rbac_registry.py) -> xóa app là bỏ luôn phân hệ / quyền.
"""
from apps.core.rbac_registry import perm_codes

MODULES = [
    {
        'module_code': 'MASTER_DATA',
        'module_name': 'Danh Mục Dữ Liệu Gốc',
        'module_name_en': 'Master data',
        'icon': 'DatabaseOutlined',
        'route_path': None,
        'parent_code': None,
        'sort_order': 20,
        'is_navigation': True,
        'is_active': True,
        'description': 'Danh mục dùng chung: Đơn vị tính, Khách hàng, Nhóm sản phẩm, Vật tư, Sơn hoàn thiện',
        'description_en': 'Shared catalogs: units, customers, product groups, materials, finishes',
    },
    {
        'module_code': 'UNIT',
        'module_name': 'Đơn Vị Tính (UOM)',
        'module_name_en': 'Units of measure',
        'icon': 'BuildOutlined',
        'route_path': '/master-data/units',
        'parent_code': 'MASTER_DATA',
        'sort_order': 10,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý danh mục Đơn vị tính dùng trong Định mức BOM và Sản xuất',
        'description_en': 'Units of measure used in BOM and production',
    },
    {
        'module_code': 'MATERIAL_CATEGORY',
        'module_name': 'Nhóm Nguyên Vật Liệu',
        'module_name_en': 'Material categories',
        'icon': 'FolderOutlined',
        'route_path': '/master-data/material-categories',
        'parent_code': 'MASTER_DATA',
        'sort_order': 20,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý phân loại nhóm nguyên vật liệu đa cấp: Gỗ, Kim loại, Hóa chất sơn, Dây đan, Vải nệm, Phụ kiện, Bao bì',
        'description_en': 'Multi-level material groups: wood, metal, paint, weaving, fabric, hardware, packaging',
    },
    {
        'module_code': 'MATERIAL',
        'module_name': 'Nguyên Vật Liệu',
        'module_name_en': 'Materials',
        'icon': 'SkinOutlined',
        'route_path': '/master-data/materials',
        'parent_code': 'MASTER_DATA',
        'sort_order': 30,
        'is_navigation': True,
        'is_active': True,
        'description': 'Quản lý danh mục Nguyên vật liệu, Quy cách phôi kim loại, Gỗ, Sơn, Phụ kiện theo chuẩn sản xuất',
        'description_en': 'Raw materials, metal profile specs, wood, paint and hardware',
    },
]

PERMISSIONS = [
    # Phân hệ UNIT (Đơn vị tính)
    {
        'permission_code': 'UNIT_VIEW',
        'permission_name': 'Truy cập Màn hình Đơn Vị Tính',
        'module': 'UNIT',
        'description': 'Hiển thị menu /master-data/units trên Sidebar và cho phép mở giao diện Đơn vị tính.'
    },
    {
        'permission_code': 'UNIT_READ',
        'permission_name': 'Xem Danh sách & Chi tiết ĐVT',
        'module': 'UNIT',
        'description': 'Gọi API đọc danh sách, chi tiết và KPI thống kê đơn vị tính.'
    },
    {
        'permission_code': 'UNIT_CREATE',
        'permission_name': 'Tạo Mới Đơn Vị Tính',
        'module': 'UNIT',
        'description': 'Mở modal và gọi API tạo mới đơn vị tính (UOM).'
    },
    {
        'permission_code': 'UNIT_UPDATE',
        'permission_name': 'Chỉnh sửa & Đổi Trạng thái ĐVT',
        'module': 'UNIT',
        'description': 'Chỉnh sửa thông tin và bật/tắt trạng thái hoạt động của đơn vị tính.'
    },
    {
        'permission_code': 'UNIT_DELETE',
        'permission_name': 'Xóa dữ liệu',
        'module': 'UNIT',
        'description': 'Xóa đơn vị tính (không khôi phục trên giao diện).'
    },
    {
        'permission_code': 'UNIT_EXPORT',
        'permission_name': 'Xuất Danh sách Ra File Excel',
        'module': 'UNIT',
        'description': 'Xuất danh sách đơn vị tính ra file Excel / CSV.'
    },
    {
        'permission_code': 'UNIT_IMPORT',
        'permission_name': 'Nhập Danh sách Từ File Excel',
        'module': 'UNIT',
        'description': 'Nhập danh sách đơn vị tính hàng loạt từ file mẫu Excel.'
    },

    # Phân hệ MATERIAL_CATEGORY (Nhóm Nguyên Vật Liệu)
    {
        'permission_code': 'MATERIAL_CATEGORY_VIEW',
        'permission_name': 'Truy cập Màn hình Nhóm Nguyên Vật Liệu',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Hiển thị menu /master-data/material-categories trên Sidebar và cho phép mở giao diện Nhóm NVL.'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_READ',
        'permission_name': 'Xem Danh sách & Chi tiết Nhóm NVL',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Gọi API đọc danh sách, cây phân cấp, chi tiết và KPI thống kê nhóm nguyên vật liệu.'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_CREATE',
        'permission_name': 'Tạo Mới Nhóm Nguyên Vật Liệu',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Mở modal và gọi API tạo mới nhóm nguyên vật liệu.'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_UPDATE',
        'permission_name': 'Chỉnh sửa & Đổi Trạng thái Nhóm NVL',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Chỉnh sửa thông tin và bật/tắt trạng thái hoạt động của nhóm nguyên vật liệu.'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_DELETE',
        'permission_name': 'Xóa Nhóm NVL',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Xóa nhóm nguyên vật liệu (không khôi phục trên giao diện).'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_EXPORT',
        'permission_name': 'Xuất Danh sách Nhóm NVL Ra File Excel',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Xuất danh sách nhóm nguyên vật liệu ra file Excel / CSV.'
    },
    {
        'permission_code': 'MATERIAL_CATEGORY_IMPORT',
        'permission_name': 'Nhập Danh sách Nhóm NVL Từ File Excel',
        'module': 'MATERIAL_CATEGORY',
        'description': 'Nhập danh sách nhóm nguyên vật liệu từ file Excel.'
    },

    # Phân hệ MATERIAL (Nguyên vật liệu)
    {
        'permission_code': 'MATERIAL_VIEW',
        'permission_name': 'Truy cập Màn hình Nguyên Vật Liệu',
        'module': 'MATERIAL',
        'description': 'Hiển thị menu /master-data/materials trên Sidebar và cho phép mở giao diện Nguyên vật liệu.'
    },
    {
        'permission_code': 'MATERIAL_READ',
        'permission_name': 'Xem Danh sách & Chi tiết NVL',
        'module': 'MATERIAL',
        'description': 'Gọi API đọc danh sách, chi tiết và thông số kỹ thuật phôi nguyên vật liệu.'
    },
    {
        'permission_code': 'MATERIAL_CREATE',
        'permission_name': 'Tạo Mới Nguyên Vật Liệu',
        'module': 'MATERIAL',
        'description': 'Mở modal và gọi API tạo mới nguyên vật liệu kèm quy cách phôi.'
    },
    {
        'permission_code': 'MATERIAL_UPDATE',
        'permission_name': 'Chỉnh sửa & Đổi Trạng thái NVL',
        'module': 'MATERIAL',
        'description': 'Chỉnh sửa thông tin, quy cách phôi và bật/tắt trạng thái hoạt động của NVL.'
    },
    {
        'permission_code': 'MATERIAL_DELETE',
        'permission_name': 'Xóa Nguyên Vật Liệu',
        'module': 'MATERIAL',
        'description': 'Xóa mềm nguyên vật liệu khỏi danh mục.'
    },
    {
        'permission_code': 'MATERIAL_EXPORT',
        'permission_name': 'Xuất Danh sách NVL Ra File Excel',
        'module': 'MATERIAL',
        'description': 'Xuất danh sách nguyên vật liệu và thông số phôi ra file Excel / CSV.'
    },
    {
        'permission_code': 'MATERIAL_IMPORT',
        'permission_name': 'Nhập Danh sách NVL Từ File Excel',
        'module': 'MATERIAL',
        'description': 'Nhập danh sách nguyên vật liệu hàng loạt từ file Excel.'
    },
]

_READ = ('VIEW', 'READ')
_EDIT = ('VIEW', 'READ', 'CREATE', 'UPDATE', 'EXPORT')

# Quyền mặc định theo vai trò (ADMIN luôn có toàn bộ quyền)
ROLE_PERMISSIONS = {
    'MANAGER': perm_codes('UNIT', *_EDIT) + perm_codes('MATERIAL_CATEGORY', *_EDIT) + perm_codes('MATERIAL', *_EDIT),
    'CHIEF_ENGINEER': perm_codes('UNIT', *_EDIT) + perm_codes('MATERIAL_CATEGORY', *_EDIT) + perm_codes('MATERIAL', *_EDIT),
    'BOM_DESIGNER': perm_codes('UNIT', *_READ) + perm_codes('MATERIAL_CATEGORY', *_READ)
    + perm_codes('MATERIAL', 'VIEW', 'READ', 'CREATE', 'UPDATE', 'EXPORT'),
    'PRODUCTION_PLANNER': perm_codes('UNIT', *_READ) + perm_codes('MATERIAL_CATEGORY', *_READ) + perm_codes('MATERIAL', *_READ),
    'WORKSHOP_SUPERVISOR': perm_codes('UNIT', *_READ) + perm_codes('MATERIAL_CATEGORY', *_READ) + perm_codes('MATERIAL', *_READ),
    'WAREHOUSE_KEEPER': perm_codes('UNIT', *_READ) + perm_codes('MATERIAL_CATEGORY', *_READ) + perm_codes('MATERIAL', *_READ),
    'STAFF': perm_codes('UNIT', *_READ) + perm_codes('MATERIAL_CATEGORY', *_READ) + perm_codes('MATERIAL', *_READ),
}
