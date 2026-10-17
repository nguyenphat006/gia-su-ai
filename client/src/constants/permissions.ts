/**
 * Bảng Hằng Số Phân Quyền Toàn Cục (Single Source of Truth cho Frontend RBAC).
 * Giúp chống lỗi chính tả (Zero Typos), hỗ trợ IDE IntelliSense Auto-complete 100%
 * và kiểm tra kiểu tĩnh (Compile-Time Type Safety) trên toàn bộ dự án.
 */
export const PERMISSIONS = {
  UNIT: {
    /** Quyền vào trang Đơn vị tính (/master-data/units) & hiển thị menu Sidebar */
    VIEW: "UNIT_VIEW",
    /** Quyền gọi API đọc danh sách, chi tiết và KPI ĐVT */
    READ: "UNIT_READ",
    /** Quyền mở form và tạo mới ĐVT */
    CREATE: "UNIT_CREATE",
    /** Quyền chỉnh sửa thông tin, bật/tắt trạng thái ĐVT */
    UPDATE: "UNIT_UPDATE",
    /** Quyền xóa mềm ĐVT */
    DELETE: "UNIT_DELETE",
    /** Quyền xuất danh sách ĐVT ra file Excel */
    EXPORT: "UNIT_EXPORT",
    /** Quyền nhập danh sách ĐVT từ file Excel */
    IMPORT: "UNIT_IMPORT",
  },
  MATERIAL_CATEGORY: {
    /** Quyền vào trang Nhóm Nguyên Vật Liệu (/master-data/material-categories) & hiển thị menu Sidebar */
    VIEW: "MATERIAL_CATEGORY_VIEW",
    /** Quyền gọi API đọc danh sách, cây phân cấp, chi tiết và KPI Nhóm NVL */
    READ: "MATERIAL_CATEGORY_READ",
    /** Quyền mở form và tạo mới Nhóm NVL */
    CREATE: "MATERIAL_CATEGORY_CREATE",
    /** Quyền chỉnh sửa thông tin, đổi trạng thái Nhóm NVL */
    UPDATE: "MATERIAL_CATEGORY_UPDATE",
    /** Quyền xóa mềm Nhóm NVL */
    DELETE: "MATERIAL_CATEGORY_DELETE",
    /** Quyền xuất danh sách Nhóm NVL ra file Excel */
    EXPORT: "MATERIAL_CATEGORY_EXPORT",
    /** Quyền nhập danh sách Nhóm NVL từ file Excel */
    IMPORT: "MATERIAL_CATEGORY_IMPORT",
  },
  MATERIAL: {
    /** Quyền vào trang Nguyên Vật Liệu (/master-data/materials) & hiển thị menu Sidebar */
    VIEW: "MATERIAL_VIEW",
    /** Quyền gọi API đọc danh sách, chi tiết và thông số phôi NVL */
    READ: "MATERIAL_READ",
    /** Quyền mở form và tạo mới NVL */
    CREATE: "MATERIAL_CREATE",
    /** Quyền chỉnh sửa thông tin, quy cách phôi NVL */
    UPDATE: "MATERIAL_UPDATE",
    /** Quyền xóa mềm NVL */
    DELETE: "MATERIAL_DELETE",
    /** Quyền xuất danh sách NVL ra file Excel */
    EXPORT: "MATERIAL_EXPORT",
    /** Quyền nhập danh sách NVL từ file Excel */
    IMPORT: "MATERIAL_IMPORT",
  },
  USER: {
    /** Quyền vào trang Quản lý Người dùng (/users) & hiển thị menu Sidebar */
    VIEW: "USER_VIEW",
    /** Quyền gọi API đọc danh sách, chi tiết người dùng và số liệu KPI */
    READ: "USER_READ",
    /** Quyền mở form và gọi API tạo mới tài khoản người dùng */
    CREATE: "USER_CREATE",
    /** Quyền chỉnh sửa thông tin, đổi vai trò, đổi trạng thái hoạt động */
    UPDATE: "USER_UPDATE",
    /** Quyền xóa tài khoản */
    DELETE: "USER_DELETE",
    /** Quyền xuất danh sách người dùng ra định dạng Excel / CSV */
    EXPORT: "USER_EXPORT",
    /** Quyền nhập danh sách người dùng từ file */
    IMPORT: "USER_IMPORT",
  },
  AUDIT_LOGS: {
    /** Quyền vào trang Nhật ký thao tác (/audit-logs) & hiển thị menu */
    VIEW: "AUDIT_LOGS_VIEW",
    /** Quyền đọc nhật ký (trang nhật ký + tab "Nhật ký hoạt động" ở trang chi tiết) */
    READ: "AUDIT_LOGS_READ",
    /** Quyền xuất nhật ký ra file */
    EXPORT: "AUDIT_LOGS_EXPORT",
  },
  SETTINGS: {
    /** Quyền vào trang Cài đặt Phân hệ & Ma trận Quyền */
    VIEW: "SETTINGS_VIEW",
    /** Quyền đọc danh sách phân hệ và ma trận quyền */
    READ: "SETTINGS_READ",
    /** Quyền đăng ký phân hệ mới và thêm action */
    CREATE: "SETTINGS_CREATE",
    /** Quyền chỉnh sửa phân hệ, sắp xếp và lưu cấu hình ma trận */
    UPDATE: "SETTINGS_UPDATE",
    /** Quyền xóa phân hệ và gỡ action */
    DELETE: "SETTINGS_DELETE",
  },
  CUSTOMER: {
    VIEW: "CUSTOMER_VIEW",
    READ: "CUSTOMER_READ",
    CREATE: "CUSTOMER_CREATE",
    UPDATE: "CUSTOMER_UPDATE",
    DELETE: "CUSTOMER_DELETE",
    EXPORT: "CUSTOMER_EXPORT",
    IMPORT: "CUSTOMER_IMPORT",
  },
  SUPPLIER: {
    VIEW: "SUPPLIER_VIEW",
    READ: "SUPPLIER_READ",
    CREATE: "SUPPLIER_CREATE",
    UPDATE: "SUPPLIER_UPDATE",
    DELETE: "SUPPLIER_DELETE",
    EXPORT: "SUPPLIER_EXPORT",
    IMPORT: "SUPPLIER_IMPORT",
  },
  // [gen:module] Module sinh bởi `npm run gen:module` được chèn phía trên dòng này
} as const;

type ValueOf<T> = T[keyof T];

/**
 * Union Type đại diện cho tất cả các mã quyền hợp lệ trong hệ thống (tự suy ra từ PERMISSIONS).
 */
export type PermissionCode = {
  [M in keyof typeof PERMISSIONS]: ValueOf<(typeof PERMISSIONS)[M]>;
}[keyof typeof PERMISSIONS];
