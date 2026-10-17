import { http } from "@/lib/api/axiosClient";
import { createCrudService } from "@/lib/api/crud";
import type { StudentCreateInput, StudentFilters, StudentImportInput, StudentImportResult, StudentItem, StudentUpdateInput } from "../types";

const RESOURCE = "/students/";

/** CRUD + statistics + batch chuẩn cho `/students/` (BaseERPViewSet) + nhập Excel (multipart). */
export const studentService = {
  ...createCrudService<StudentItem, StudentCreateInput, StudentUpdateInput, StudentFilters>(RESOURCE),
  /** Nhập học sinh từ file .xlsx; trả danh sách mật khẩu ban đầu (chỉ một lần) */
  importExcel: ({ file, grade, school_class }: StudentImportInput) => {
    const body = new FormData();
    body.append("file", file);
    if (grade) body.append("grade", String(grade));
    if (school_class) body.append("school_class", String(school_class));
    return http.post<StudentImportResult>(`${RESOURCE}import-excel/`, body, { headers: { "Content-Type": "multipart/form-data" } });
  },
};
