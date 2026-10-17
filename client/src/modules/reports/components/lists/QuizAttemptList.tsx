"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { StatusBadge, statusOptions } from "@/components/common/StatusBadge";
import { defineColumns } from "@/components/list";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { useQuizAttempts } from "../../hooks/useReportsQuery";
import { buildListParams } from "../../listParams";
import { QUIZ_TYPE } from "../../statusMaps";
import type { QuizAttemptRow } from "../../types";
import { ReportListCard } from "../ReportListCard";
import { studentColumns, timeColumn, type ReportListProps } from "./columns";

/** Mức độ chính xác: >= 80% tốt, >= 50% trung bình, còn lại cần chú ý */
const accuracyTone = (v: number) => (v >= 80 ? "text-[var(--c-success)]" : v >= 50 ? "text-foreground" : "text-[var(--c-error)]");

/** Lịch sử ôn tập: loại bài, chủ đề, đúng / tổng, độ chính xác, XP */
export function QuizAttemptList({ list, base, embedded }: ReportListProps) {
  const t = useTranslations("reports");
  const tr = useTranslations();
  const { formatNumber } = useNumberFormat();
  const params = useMemo(() => buildListParams(list.params, base, { scoped: !embedded }), [list.params, base, embedded]);
  const query = useQuizAttempts(params);

  const columns = useMemo(
    () =>
      defineColumns<QuizAttemptRow>([
        ...studentColumns<QuizAttemptRow>({ student: t("fields.student"), class: t("fields.class") }, embedded),
        {
          key: "quiz_type",
          title: t("fields.quizType"),
          width: 180,
          filter: { type: "select", options: statusOptions(QUIZ_TYPE, tr) },
          render: (v) => <StatusBadge map={QUIZ_TYPE} value={v} />,
        },
        { key: "topic", title: t("fields.topic"), width: 200, ellipsis: true, render: (v: string | null) => v || <span className="list-empty-value">—</span> },
        {
          key: "correct_count",
          title: t("fields.result"),
          width: 100,
          align: "right",
          sortable: true,
          render: (v: number, r) => <span className="tabular-nums">{t("quiz.result", { correct: v, total: r.total_questions })}</span>,
        },
        {
          key: "accuracy",
          title: t("fields.accuracy"),
          width: 100,
          align: "right",
          render: (v: number) => <span className={`font-medium tabular-nums ${accuracyTone(v)}`}>{v}%</span>,
        },
        { key: "xp_earned", title: t("fields.xp"), width: 80, align: "right", sortable: true, render: (v: number | undefined) => <span className="tabular-nums">{formatNumber(v ?? 0)}</span> },
        timeColumn<QuizAttemptRow>(t("fields.time"), embedded),
      ]),
    [t, tr, embedded, formatNumber],
  );

  return (
    <ReportListCard<QuizAttemptRow>
      tableKey={embedded ? "report-student-quiz" : "report-quiz"}
      list={list}
      query={query}
      columns={columns}
      entityLabel={t("quiz.entity")}
      scoped={!embedded}
      searchable={false}
      footnote={embedded ? t("detail.dateHint") : undefined}
    />
  );
}
