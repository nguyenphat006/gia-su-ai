"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Flame, Medal, Sparkles, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { ErrorBlock } from "./ui";
import type { MyStats } from "./types";

/** Khối danh hiệu + tiến độ lên cấp (nền thương hiệu cố định, chữ trắng) */
export function LevelCard({ stats, loading, error, onRetry }: { stats?: MyStats; loading?: boolean; error?: boolean; onRetry?: () => void }) {
  const t = useTranslations("learn");
  const { formatNumber } = useNumberFormat();

  if (loading) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (error || !stats)
    return (
      <div className="rounded-xl border bg-card">
        <ErrorBlock onRetry={onRetry} />
      </div>
    );

  const { level } = stats;
  // Server trả `progress` theo phần trăm (0..100)
  const percent = Math.round(Math.max(0, Math.min(100, level.progress)));
  const remaining = level.next_min_xp != null ? Math.max(0, level.next_min_xp - stats.total_xp) : 0;

  return (
    <section className="relative overflow-hidden rounded-xl p-4 text-white sm:p-6" style={{ background: "var(--c-brand-gradient)" }}>
      <Sparkles className="pointer-events-none absolute -top-2 -right-2 size-24 text-white/10" aria-hidden />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-white/80">{t("level.current")}</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <Medal className="size-5 shrink-0" aria-hidden />
            <span className="truncate">{level.title || t("level.newbie")}</span>
          </h2>
          <p className="mt-1 text-sm text-white/85">{t("level.totalXp", { xp: formatNumber(stats.total_xp) })}</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            <Flame className="size-4" aria-hidden />
            {t("streakDays", { count: stats.current_streak })}
          </span>
          {stats.weekly_rank != null && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <Trophy className="size-4" aria-hidden />
              {t("level.weeklyRank", { rank: stats.weekly_rank })}
            </span>
          )}
        </div>
      </div>
      <div className="relative mt-4">
        <Progress value={percent} className="h-2.5 bg-white/20 [&>[data-slot=progress-indicator]]:bg-white" aria-label={t("level.progressLabel")} />
        <p className="mt-2 text-xs text-white/85">
          {level.next_title ? t("level.toNext", { xp: formatNumber(remaining), title: level.next_title }) : t("level.maxLevel")}
        </p>
      </div>
    </section>
  );
}
