"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { cn } from "@/lib/utils";
import type { LeaderRow } from "../../types";

/** Top học sinh nhận nhiều XP nhất trong khoảng thời gian (tối đa 10 dòng) */
export function XpLeaderboard({ rows }: { rows: LeaderRow[] }) {
  const t = useTranslations("reports");
  const { formatNumber } = useNumberFormat();
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("leaderboard.empty")}</p>;
  return (
    <ol className="divide-y">
      {rows.map((r) => (
        <li key={r.user_id} className="flex items-center gap-3 py-2">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
              r.rank <= 3 ? "bg-[var(--c-primary-bg)] text-[var(--c-primary)]" : "text-muted-foreground",
            )}
          >
            {r.rank}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">{r.full_name}</span>
            <span className="block truncate text-xs text-muted-foreground">{[r.student_code, r.class_name].filter(Boolean).join(" · ")}</span>
          </span>
          <span className="shrink-0 text-sm font-medium text-foreground tabular-nums">{t("leaderboard.xp", { xp: formatNumber(r.xp) })}</span>
        </li>
      ))}
    </ol>
  );
}
