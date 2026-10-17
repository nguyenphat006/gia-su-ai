"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ACTIVE_STATUS, StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { CodeText, defineColumns, RelativeTime, useExcelExport, type ListColumn, type ListState } from "@/components/list";
import { PERMISSIONS } from "@/constants/permissions";
import { usePermission } from "@/hooks/usePermission";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { useStudentReports } from "../../hooks/useReportsQuery";
import { buildListParams } from "../../listParams";
import type { ReportScopeParams, StudentReportRow } from "../../types";
import { ReportListCard } from "../ReportListCard";

export const studentReportHref = (id: number) => `/reports/students/${id}`;

/** Thống kê theo học sinh trong phạm vi: tìm, sắp xếp cột số, xuất Excel; bấm tên -> trang chi tiết */
export function StudentReportList({ list, scope }: { list: ListState; scope: ReportScopeParams }) {
  const t = useTranslations("reports");
  const tr = useTranslations();
  const ta = useTranslations("academics");
  const { can } = usePermission();
  const { formatNumber } = useNumberFormat();
  const params = useMemo(() => buildListParams(list.params, { ...scope }), [list.params, scope]);
  const query = useStudentReports(params);
  // Xuất theo đúng phạm vi đang xem (ngày, khối, lớp) + tìm kiếm / bộ lọc của bảng
  const exportList = useMemo<ListState>(() => ({ ...list, params }), [list, params]);
  const { openExport, exportModal } = useExcelExport({
    endpoint: "/reports/students/",
    label: t("students.exportLabel"),
    list: exportList,
    total: query.data?.count ?? 0,
    preview: query.data?.results,
  });

  const columns = useMemo(() => {
    const count = (key: keyof StudentReportRow, title: string, sortable = true): ListColumn<StudentReportRow> => ({
      key,
      title,
      width: 96,
      align: "right",
      sortable,
      render: (v: number | null) => <span className="tabular-nums">{formatNumber(v ?? 0)}</span>,
    });
    return defineColumns<StudentReportRow>([
      { key: "student_code", title: t("fields.studentCode"), width: 110, pinned: "left", hideable: false, sortable: true, render: (v: string) => <CodeText>{v}</CodeText> },
      { key: "full_name", title: t("fields.fullName"), width: 200, sortable: "user__full_name", link: (r) => studentReportHref(r.id) },
      { key: "grade", title: ta("gradeLabel"), width: 80, sortable: true, render: (v: number) => ta("grade", { grade: v }) },
      { key: "school_class_name", title: t("fields.class"), width: 110, render: (v: string) => v || <span className="list-empty-value">—</span> },
      count("chat_count", t("fields.chatCount")),
      count("quiz_count", t("fields.quizCount")),
      count("arena_count", t("fields.arenaCount")),
      { ...count("flashcard_count", t("fields.flashcardCount"), false), defaultHidden: true },
      { ...count("mindmap_count", t("fields.mindmapCount"), false), defaultHidden: true },
      count("total_xp", t("fields.totalXp")),
      {
        key: "current_streak",
        title: t("fields.currentStreak"),
        width: 110,
        align: "right",
        sortable: true,
        render: (v: number | null) => <span className="tabular-nums">{t("students.streakDays", { count: v ?? 0 })}</span>,
      },
      { key: "level_title", title: t("fields.levelTitle"), width: 140, ellipsis: true, defaultHidden: true },
      { key: "last_active_at", title: t("fields.lastActiveAt"), width: 150, sortable: true, render: (v: string | null) => <RelativeTime value={v} /> },
      {
        key: "is_active",
        title: tr("common.fields.status"),
        width: 120,
        defaultHidden: true,
        filter: { type: "select", options: statusOptions(ACTIVE_STATUS, tr) },
        render: (v) => <StatusBadge map={ACTIVE_STATUS} value={v} />,
      },
    ]);
  }, [t, tr, ta, formatNumber]);

  return (
    <ReportListCard<StudentReportRow>
      tableKey="report-students"
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("students.entity")}
      searchPlaceholder={t("students.searchPlaceholder")}
      onExport={can(PERMISSIONS.REPORT.EXPORT) ? () => openExport([]) : undefined}
    >
      {exportModal}
    </ReportListCard>
  );
}
