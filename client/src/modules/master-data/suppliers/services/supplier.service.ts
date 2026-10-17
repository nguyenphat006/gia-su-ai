import { createCrudService } from "@/lib/api/crud";
import type { SupplierCreateInput, SupplierFilters, SupplierItem, SupplierUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/suppliers/` (BaseERPViewSet). Endpoint riêng: thêm bằng http.get/post. */
export const supplierService = createCrudService<
  SupplierItem,
  SupplierCreateInput,
  SupplierUpdateInput,
  SupplierFilters
>("/suppliers/");
