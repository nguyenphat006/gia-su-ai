"use client";

import React, { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ACTIVE_STATUS, StatusBadge } from "@/components/common/StatusBadge";
import { DetailPage, type HeroField } from "@/components/detail";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { ArenaMatchList } from "./components/lists/ArenaMatchList";
import { ChatLogList } from "./components/lists/ChatLogList";
import { QuizAttemptList } from "./components/lists/QuizAttemptList";
import { TimelineTab } from "./components/student/TimelineTab";
import { useLocalListState } from "./hooks/useLocalListState";
import { useStudentReport, useStudentSummary } from "./hooks/useReportsQuery";
import type { StudentReportRow, StudentReportSummary } from "./types";

/* Danh sách nhúng: trạng thái trong component (URL dành cho ?tab=), lọc cố định theo tài khoản học sinh */
function UserChatTab({ userId }: { userId: number }) {
  const base = useMemo(() => ({ user: userId }), [userId]);
  return <ChatLogList list={useLocalListState()} base={base} embedded />;
}
function UserArenaTab({ userId }: { userId: number }) {
  const base = useMemo(() => ({ user: userId }), [userId]);
  return <ArenaMatchList list={useLocalListState()} base={base} embedded />;
}
function UserQuizTab({ userId }: { userId: number }) {
  const base = useMemo(() => ({ user: userId }), [userId]);
  return <QuizAttemptList list={useLocalListState()} base={base} embedded />;
}

/** Chỉ số tổng hợp hiển thị ở lưới thuộc tính của Hero (tải song song với bản ghi) */
function useSummaryFields(student: StudentReportRow | undefined, summary: StudentReportSummary | undefined, loading: boolean): HeroField[] {
  const t = useTranslations("reports");
  const { formatNumber } = useNumberFormat();
  if (!student) return [];
  const value = (render: (s: StudentReportSummary) => React.ReactNode) => (summary ? render(summary) : loading ? <Skeleton className="h-5 w-16" /> : null);
  return [
    { label: t("detail.summary.totalXp"), value: value((s) => formatNumber(s.total_xp)) },
    { label: t("detail.summary.weeklyXp"), value: value((s) => formatNumber(s.weekly_xp)) },
    { label: t("detail.summary.points"), value: value((s) => formatNumber(s.points)) },
    { label: t("detail.summary.streak"), value: value((s) => t("detail.streakValue", { count: s.current_streak })) },
    { label: t("detail.summary.longestStreak"), value: value((s) => t("detail.streakValue", { count: s.longest_streak })) },
    { label: t("detail.summary.quizAccuracy"), value: value((s) => (s.quiz_accuracy == null ? null : `${s.quiz_accuracy}%`)) },
    { label: t("detail.summary.arenaWins"), value: value((s) => t("detail.winsValue", { wins: s.arena_wins, total: s.arena_matches })) },
    { label: t("detail.username"), value: student.username },
  ];
}

/**
 * Báo cáo một học sinh (/reports/students/[id], id = StudentProfile): Hero (tên, mã, lớp, danh hiệu + chỉ số tổng hợp)
 * → tab Hoạt động · Hỏi đáp AI · Đấu trường · Ôn tập (mỗi tab tự tải khi mở).
 */
export function StudentReportDetailView({ studentId }: { studentId: number }) {
  const t = useTranslations("reports");
  const ta = useTranslations("academics");
  const query = useStudentReport(studentId);
  const summary = useStudentSummary(query.data ? studentId : 0);
  const fields = useSummaryFields(query.data, summary.data, summary.isLoading || !query.data);

  return (
    <DetailPage<StudentReportRow>
      query={query}
      backHref="/reports"
      entityLabel={t("detail.entity")}
      hero={(s) => ({
        title: s.full_name,
        code: s.student_code,
        badges: [
          <StatusBadge key="level" tone="accent" label={s.level_title} />,
          ...(s.is_active ? [] : [<StatusBadge key="active" map={ACTIVE_STATUS} value={s.is_active} />]),
        ],
        subtitle: [s.school_class_name || null, ta("grade", { grade: s.grade })].filter(Boolean),
        fields,
      })}
      tabs={(s) => [
        { key: "activity", label: t("detail.tabs.activity"), children: <TimelineTab studentId={s.id} /> },
        { key: "chat", label: t("detail.tabs.chat"), children: <UserChatTab userId={s.user_id} /> },
        { key: "arena", label: t("detail.tabs.arena"), children: <UserArenaTab userId={s.user_id} /> },
        { key: "quiz", label: t("detail.tabs.quiz"), children: <UserQuizTab userId={s.user_id} /> },
      ]}
    />
  );
}

export default StudentReportDetailView;
