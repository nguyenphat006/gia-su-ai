import type { Schemas } from "@/types/api";

/** Kiểu dữ liệu sinh từ OpenAPI (serializer backend) — chạy `npm run gen:api` khi backend đổi. */
export type SchoolClassItem = Schemas["SchoolClass"];
export type SchoolClassCreateInput = Schemas["SchoolClassCreateUpdateRequest"];
export type SchoolClassUpdateInput = Omit<SchoolClassCreateInput, "code">;

export interface SchoolClassFilters {
  search?: string;
  is_active?: boolean;
  grade?: number;
  academic_year?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}
