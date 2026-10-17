import { createCrudService } from "@/lib/api/crud";
import type { TeacherCreateInput, TeacherFilters, TeacherItem, TeacherUpdateInput } from "../types";

/** CRUD + statistics + batch actions chuẩn cho `/teachers/` (BaseERPViewSet). Endpoint riêng: thêm bằng http.get/post. */
export const teacherService = createCrudService<
  TeacherItem,
  TeacherCreateInput,
  TeacherUpdateInput,
  TeacherFilters
>("/teachers/");
