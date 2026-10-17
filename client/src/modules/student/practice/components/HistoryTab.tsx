"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { History, Layers, NotebookPen, Zap } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState/EmptyState";
import { cn } from "@/lib/utils";
import { ErrorBlock, Panel, RowsSkeleton } from "../../shared/ui";
import { LEARN_KEY } from "../../shared/useLearnQueries";
import { practiceService } from "../practice.service";

export const PRACTICE_HISTORY_KEY = [...LEARN_KEY, "practice", "history"] as const;

/** Tab "Lịch sử": 20 lượt ôn tập gần nhất */
export function HistoryTab() {
  const t = useTranslations("learnPractice");
  const tl = useTranslations("learn");
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: PRACTICE_HISTORY_KEY, queryFn: practiceService.history, staleTime: 30_000 });

  return (
    <Panel title={t("history.title")} icon={<History />}>
      {isLoading ? (
        <RowsSkeleton rows={5} className="[&>*]:h-14" />
      ) : isError ? (
        <ErrorBlock onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState title={t("history.empty")} description={t("history.emptyHint")} />
      ) : (
        <ul className="divide-y">
          {data.map((h) => {
            const ratio = h.total_questions ? h.correct_count / h.total_questions : 0;
            const isFlashcard = h.quiz_type === "FLASHCARD_QUIZ";
            return (
              <li key={h.id} className="flex items-center gap-3 py-3">
                <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", isFlashcard ? "bg-[var(--c-purple-bg)] text-[var(--c-purple)]" : "bg-[var(--c-primary-bg)] text-[var(--c-primary)]")}>
                  {isFlashcard ? <Layers className="size-4" /> : <NotebookPen className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{h.topic || t("history.noTopic")}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[t(`history.type.${isFlashcard ? "flashcard" : "quiz"}`), h.grade ? tl("setup.gradeOption", { grade: h.grade }) : null, h.created_at].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-sm font-semibold tabular-nums", ratio >= 0.8 ? "text-[var(--c-success)]" : ratio >= 0.5 ? "text-[var(--c-warning)]" : "text-[var(--c-error)]")}>
                    {h.correct_count}/{h.total_questions}
                  </p>
                  {(h.xp_earned ?? 0) > 0 && (
                    <p className="flex items-center justify-end gap-0.5 text-xs text-[var(--c-warning)]">
                      <Zap className="size-3" aria-hidden />
                      {tl("xpReward", { xp: h.xp_earned ?? 0 })}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
