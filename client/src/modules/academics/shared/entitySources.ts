import { http } from "@/lib/api/axiosClient";
import type { Paginated } from "@/lib/api/types";
import type { EntityFetchParams, EntityOptionsSource } from "@/components/controls/useEntityOptions";
import type { Schemas } from "@/types/api";

type TeacherRow = Schemas["Teacher"];
type ClassRow = Schemas["SchoolClass"];

/** Giáo viên đang hoạt động — giá trị là `user_id` (khóa ngoại homeroom_teacher trỏ tới User) */
export const activeTeacherSource: EntityOptionsSource<TeacherRow> = {
  queryKey: ["teachers", "active-options"],
  fetchPage: (params: EntityFetchParams) => http.get<Paginated<TeacherRow>>("/teachers/", { params: { ...params, is_active: true } }),
  toOption: (r) => ({ value: String(r.user_id), label: r.full_name, code: r.employee_code, description: r.subject || undefined }),
};

/** Lớp học — giá trị là id lớp */
export const schoolClassSource: EntityOptionsSource<ClassRow> = {
  queryKey: ["school-classes", "options"],
  fetchPage: (params: EntityFetchParams) => http.get<Paginated<ClassRow>>("/classes/", { params: { ...params, ordering: "code" } }),
  toOption: (r) => ({ value: String(r.id), label: r.name, code: r.code, description: r.academic_year }),
};
