import { createCrudService } from "@/lib/api/crud";
import type { SchoolClassCreateInput, SchoolClassFilters, SchoolClassItem, SchoolClassUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/classes/` (BaseERPViewSet). Endpoint riêng: thêm bằng http.get/post. */
export const schoolClassService = createCrudService<
  SchoolClassItem,
  SchoolClassCreateInput,
  SchoolClassUpdateInput,
  SchoolClassFilters
>("/classes/");
