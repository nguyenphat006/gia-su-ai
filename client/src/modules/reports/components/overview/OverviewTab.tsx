"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { useReportHeatmap, useReportOverview, useXpLeaderboard } from "../../hooks/useReportsQuery";
import type { ReportOverview, ReportScopeParams } from "../../types";
import { DailyChart } from "./DailyChart";
import { StudyHeatmap } from "./StudyHeatmap";
import { XpLeaderboard } from "./XpLeaderboard";

const LEADERBOARD_LIMIT = 10;

function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`dash-panel ${className}`}>
      <h2 className="dash-panel__title">{title}</h2>
      {children}
    </section>
  );
}

/** Lỗi tải trong một khối: thông điệp + Thử lại, giữ chiều cao khối */
function PanelError({ onRetry, height = 240 }: { onRetry: () => void; height?: number }) {
  const tc = useTranslations("common");
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground" style={{ minHeight: height }}>
      <p>{tc("messages.loadError")}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {tc("actions.retry")}
      </Button>
    </div>
  );
}

function KpiCards({ data }: { data: ReportOverview }) {
  const t = useTranslations("reports");
  const { formatNumber } = useNumberFormat();
  const activeRate = data.total_students ? Math.round((data.active_students * 100) / data.total_students) : 0;
  const kpis = [
    { key: "totalStudents", value: formatNumber(data.total_students), hint: t("overview.hints.inScope") },
    { key: "activeStudents", value: formatNumber(data.active_students), hint: t("overview.hints.activeRate", { percent: activeRate }) },
    { key: "chatQuestions", value: formatNumber(data.chat_questions), hint: t("overview.hints.inRange") },
    {
      key: "quizAttempts",
      value: formatNumber(data.quiz_attempts),
      hint: t("overview.hints.views", { flashcards: formatNumber(data.flashcard_views), mindmaps: formatNumber(data.mindmap_views) }),
    },
    { key: "arenaMatches", value: formatNumber(data.arena_matches), hint: t("overview.hints.inRange") },
    {
      key: "quizAccuracy",
      value: data.quiz_accuracy == null ? "—" : `${data.quiz_accuracy}%`,
      hint: data.quiz_accuracy == null ? t("overview.hints.noAttempts") : t("overview.hints.accuracy"),
    },
  ] as const;
  return (
    <>
      {kpis.map((k) => (
        <div key={k.key} className="kpi-card">
          <span className="kpi-card__label">{t(`overview.kpis.${k.key}`)}</span>
          <span className="kpi-card__value">{k.value}</span>
          <span className="kpi-card__hint">{k.hint}</span>
        </div>
      ))}
    </>
  );
}

/** Tab Tổng quan: KPI → hoạt động theo ngày + top XP → heatmap giờ học. 3 API tổng hợp theo phạm vi chung. */
export function OverviewTab({ scope }: { scope: ReportScopeParams }) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const overview = useReportOverview({ ...scope });
  const heatmap = useReportHeatmap({ ...scope });
  const leaders = useXpLeaderboard({ ...scope, limit: LEADERBOARD_LIMIT });

  if (overview.isError && !overview.data) {
    return (
      <div className="dash-panel">
        <EmptyState title={t("overview.loadError")} description={tc("messages.loadError")} actionText={tc("actions.retry")} onAction={() => overview.refetch()} actionType="default" icon={null} />
      </div>
    );
  }

  const noActivity = overview.data && overview.data.daily.every((d) => d.events === 0);

  return (
    <div className="space-y-4">
      <div className="dash-kpis" style={{ "--kpi-cols": 3 } as React.CSSProperties}>
        {overview.data ? (
          <KpiCards data={overview.data} />
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="kpi-card">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-20" />
              <Skeleton className="mt-2 h-3 w-32" />
            </div>
          ))
        )}
      </div>

      <div className="dash-grid">
        <Panel title={t("overview.panels.daily")} className="dash-grid__wide">
          {!overview.data ? (
            <Skeleton className="h-[280px] w-full" />
          ) : noActivity ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">{t("overview.noActivity")}</p>
          ) : (
            <DailyChart data={overview.data.daily} />
          )}
        </Panel>
        <Panel title={t("overview.panels.leaderboard")}>
          {leaders.isError && !leaders.data ? (
            <PanelError onRetry={() => leaders.refetch()} />
          ) : !leaders.data ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <XpLeaderboard rows={leaders.data} />
          )}
        </Panel>
        <Panel title={t("overview.panels.heatmap")} className="dash-grid__full">
          {heatmap.isError && !heatmap.data ? (
            <PanelError onRetry={() => heatmap.refetch()} height={180} />
          ) : !heatmap.data ? (
            <Skeleton className="h-[180px] w-full" />
          ) : (
            <StudyHeatmap cells={heatmap.data} />
          )}
        </Panel>
      </div>
    </div>
  );
}
