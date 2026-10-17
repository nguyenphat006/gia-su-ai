import type { Schemas } from "@/types/api";

/**
 * Kiểu dữ liệu sinh từ OpenAPI (serializer backend). Chạy `npm run gen:api` sau khi backend có endpoint.
 * Thêm trường mới: sửa serializer backend -> spectacular -> gen:api (không gõ tay ở đây).
 */
export type SupplierItem = Schemas["Supplier"];
export type SupplierCreateInput = Schemas["SupplierCreateUpdateRequest"];
export type SupplierUpdateInput = Omit<SupplierCreateInput, "supplier_code">;

export interface SupplierFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
  ordering?: string;
}
