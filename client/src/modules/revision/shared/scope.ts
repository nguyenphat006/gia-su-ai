import { defineStatusMap } from "@/components/common/StatusBadge";
import type { Grade } from "@/modules/academics/shared/grades";
import type { Schemas } from "@/types/api";

export type Origin = Schemas["OriginEnum"];

/** Nguồn nội dung ôn tập (nhập tay / AI sinh / từ tài liệu) — badge + options bộ lọc */
export const ORIGIN_STATUS = defineStatusMap<Origin>({
  MANUAL: { label: "revision.origin.MANUAL", tone: "neutral" },
  AI: { label: "revision.origin.AI", tone: "accent" },
  DOCUMENT: { label: "revision.origin.DOCUMENT", tone: "info" },
});

/** Giá trị khối trong form (chuỗi; "" / null = dùng chung) -> payload API */
export function toGradePayload(value: string | null | undefined): Grade | null {
  return value ? (Number(value) as Grade) : null;
}

/** Khối từ API -> giá trị form */
export function fromGrade(grade: number | null | undefined): string | null {
  return grade == null ? null : String(grade);
}

/** Phạm vi chung của nội dung ôn tập (khối / lớp riêng / chủ đề) */
export interface ScopeFormValues {
  grade: string | null;
  school_class: number | null;
  topic: string;
}

export const EMPTY_SCOPE: ScopeFormValues = { grade: null, school_class: null, topic: "" };

export function scopePayload(values: ScopeFormValues) {
  return { grade: toGradePayload(values.grade), school_class: values.school_class ?? null, topic: values.topic.trim() };
}
