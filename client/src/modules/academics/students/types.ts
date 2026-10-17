import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type StudentItem = Schemas["Student"];
export type StudentCreateInput = Schemas["StudentCreateUpdateRequest"];
/** Sửa: không đổi tên đăng nhập; mật khẩu bỏ trống = giữ nguyên */
export type StudentUpdateInput = Omit<Schemas["PatchedStudentCreateUpdateRequest"], "username">;
export type StudentImportResult = Schemas["StudentImportResult"];
export type ImportCredential = Schemas["ImportCredential"];

export interface StudentImportInput {
  file: File;
  grade?: number | null;
  school_class?: number | null;
}

export interface StudentFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  school_class?: number;
  page?: number;
  page_size?: number;
  ordering?: string;
}
