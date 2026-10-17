"use client";

import React from "react";
import { RelativeTime, type ListColumn, type ListState } from "@/components/list";

/** Props chung của các danh sách báo cáo dùng lại ở /reports và tab trang chi tiết học sinh */
export interface ReportListProps {
  list: ListState;
  /** Tham số cố định gửi kèm: phạm vi chung (/reports) hoặc `{ user }` (trang chi tiết) — truyền giá trị đã memo */
  base: Record<string, string | number | undefined>;
  /** true = nhúng trong trang chi tiết học sinh: ẩn cột học sinh / lớp, lọc ngày ở cột Thời gian */
  embedded?: boolean;
}

/** Cột thời gian; danh sách nhúng lọc khoảng ngày bằng date_from / date_to của API */
export function timeColumn<T>(title: string, embedded: boolean | undefined): ListColumn<T> {
  return {
    key: "created_at",
    title,
    width: 140,
    sortable: true,
    filter: embedded ? { type: "date", params: ["date_from", "date_to"] } : undefined,
    render: (v: string) => <RelativeTime value={v} />,
  };
}

/** Cột học sinh + lớp (ẩn khi đã ở trang của một học sinh) */
export function studentColumns<T extends { student_name: string; class_name: string | null }>(
  labels: { student: string; class: string },
  embedded: boolean | undefined,
): ListColumn<T>[] {
  if (embedded) return [];
  return [
    { key: "student_name", title: labels.student, width: 180, ellipsis: true },
    { key: "class_name", title: labels.class, width: 110, render: (v: string | null) => v || <span className="list-empty-value">—</span> },
  ];
}
