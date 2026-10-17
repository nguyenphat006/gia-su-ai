"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { useNumberFormat } from "@/providers/NumberFormatProvider";
import { cn } from "@/lib/utils";
import { ErrorBlock, RowsSkeleton } from "./ui";

export interface LeaderItem {
  key: string | number;
  rank: number;
  name: string;
  subtitle?: string | null;
  value: number;
  valueSuffix: string;
  isMe: boolean;
}

const MEDAL_TONES = ["var(--c-warning)", "var(--c-text-tertiary)", "var(--c-error)"];

/** Bảng xếp hạng dạng danh sách (dùng cho XP và đấu trường) — dòng của mình được tô nổi */
export function LeaderboardList({
  items,
  loading,
  error,
  onRetry,
  rows = 5,
}: {
  items: LeaderItem[] | undefined;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  rows?: number;
}) {
  const t = useTranslations("learn");
  const { formatNumber } = useNumberFormat();
  if (loading) return <RowsSkeleton rows={rows} />;
  if (error) return <ErrorBlock onRetry={onRetry} />;
  if (!items?.length) return <EmptyState title={t("leaderboard.empty")} />;

  return (
    <ol className="space-y-1">
      {items.map((row) => (
        <li
          key={row.key}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2",
            row.isMe ? "bg-[var(--c-primary-bg)] ring-1 ring-[var(--c-primary-border)]" : "hover:bg-[var(--c-bg-subtle)]",
          )}
          aria-current={row.isMe ? "true" : undefined}
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--c-bg-muted)] text-xs font-semibold tabular-nums"
            style={row.rank <= 3 ? { color: MEDAL_TONES[row.rank - 1] } : undefined}
          >
            {row.rank <= 3 ? <Crown className="size-4" aria-label={String(row.rank)} /> : row.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-sm", row.isMe ? "font-semibold text-[var(--c-primary)]" : "font-medium text-foreground")}>
              {row.name}
              {row.isMe && <span className="ml-1 text-xs font-normal">({t("leaderboard.me")})</span>}
            </p>
            {row.subtitle && <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>}
          </div>
          <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
            {formatNumber(row.value)} <span className="text-xs font-normal text-muted-foreground">{row.valueSuffix}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
