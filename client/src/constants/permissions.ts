/**
 * Bảng Hằng Số Phân Quyền Toàn Cục (Single Source of Truth cho Frontend RBAC).
 * Giúp chống lỗi chính tả (Zero Typos), hỗ trợ IDE IntelliSense Auto-complete 100%
 * và kiểm tra kiểu tĩnh (Compile-Time Type Safety) trên toàn bộ dự án.
 */
export const PERMISSIONS = {
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
  CLASS: {
    VIEW: "CLASS_VIEW",
    READ: "CLASS_READ",
    CREATE: "CLASS_CREATE",
    UPDATE: "CLASS_UPDATE",
    DELETE: "CLASS_DELETE",
    EXPORT: "CLASS_EXPORT",
    IMPORT: "CLASS_IMPORT",
  },
  STUDENT: {
    VIEW: "STUDENT_VIEW",
    READ: "STUDENT_READ",
    CREATE: "STUDENT_CREATE",
    UPDATE: "STUDENT_UPDATE",
    DELETE: "STUDENT_DELETE",
    EXPORT: "STUDENT_EXPORT",
    IMPORT: "STUDENT_IMPORT",
  },
  TEACHER: {
    VIEW: "TEACHER_VIEW",
    READ: "TEACHER_READ",
    CREATE: "TEACHER_CREATE",
    UPDATE: "TEACHER_UPDATE",
    DELETE: "TEACHER_DELETE",
    EXPORT: "TEACHER_EXPORT",
    IMPORT: "TEACHER_IMPORT",
  },
  AI_SETTING: {
    VIEW: "AI_SETTING_VIEW",
    READ: "AI_SETTING_READ",
    CREATE: "AI_SETTING_CREATE",
    UPDATE: "AI_SETTING_UPDATE",
    DELETE: "AI_SETTING_DELETE",
    EXPORT: "AI_SETTING_EXPORT",
    IMPORT: "AI_SETTING_IMPORT",
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
