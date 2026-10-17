import type { Schemas } from "@/types/api";

export type Grade = Schemas["GradeEnum"];

/** Khối THCS (khớp GradeEnum ở backend) */
export const GRADES: readonly Grade[] = [6, 7, 8, 9];

/** Options khối cho bộ lọc / ô chọn; `t` = useTranslations("academics") */
export function gradeOptions(t: (key: "grade", values: { grade: number }) => string) {
  return GRADES.map((grade) => ({ value: String(grade), label: t("grade", { grade }) }));
}
