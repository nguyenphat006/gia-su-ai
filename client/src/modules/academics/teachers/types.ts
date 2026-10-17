import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type TeacherItem = Schemas["Teacher"];
export type TeacherCreateInput = Schemas["TeacherCreateUpdateRequest"];
/** Sửa: không đổi tên đăng nhập; mật khẩu bỏ trống = giữ nguyên */
export type TeacherUpdateInput = Omit<Schemas["PatchedTeacherCreateUpdateRequest"], "username">;

export interface TeacherFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
}
