"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Target } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ErrorBlock, RowsSkeleton } from "./ui";
import type { ChallengeProgress } from "./types";

const NO_CHALLENGES: ChallengeProgress[] = [];

/** Danh sách thử thách kèm tiến độ */
export function ChallengeList({
  items = NO_CHALLENGES,
  loading,
  error,
  onRetry,
  showPeriod = false,
}: {
  items?: ChallengeProgress[];
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  showPeriod?: boolean;
}) {
  const t = useTranslations("learn");
  if (loading) return <RowsSkeleton rows={3} className="[&>*]:h-14" />;
  if (error) return <ErrorBlock onRetry={onRetry} />;
  if (!items.length) return <EmptyState title={t("challenges.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((c) => {
        const percent = c.goal > 0 ? Math.min(100, Math.round((c.progress / c.goal) * 100)) : 0;
        return (
          <li key={c.id} className={cn("rounded-lg p-3", c.completed ? "bg-[var(--c-success-bg)]" : "bg-[var(--c-bg-subtle)]")}>
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  c.completed ? "bg-[var(--c-success)] text-white" : "bg-[var(--c-warning-bg)] text-[var(--c-warning)]",
                )}
              >
                {c.completed ? <CheckCircle2 className="size-4" /> : <Target className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-2">
                  <p className="text-sm font-medium text-foreground">{c.name}</p>
                  <span className="text-xs font-semibold text-[var(--c-warning)]">{t("xpReward", { xp: c.xp_reward })}</span>
                </div>
                {c.description && <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={percent} className="h-1.5 flex-1 bg-[var(--c-bg-muted)] [&>[data-slot=progress-indicator]]:bg-[var(--c-success)]" />
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {c.progress}/{c.goal}
                  </span>
                </div>
                {showPeriod && <p className="mt-1 text-[11px] text-muted-foreground">{t(`challenges.period.${periodKey(c.period)}`)}</p>}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function periodKey(period: string): "daily" | "weekly" | "once" {
  if (period === "DAILY") return "daily";
  if (period === "WEEKLY") return "weekly";
  return "once";
}
